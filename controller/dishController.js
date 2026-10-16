import fs from "fs";
import path from "path";
import { Op, fn, col, where as sqlWhere } from "sequelize";
import { dbConnect } from "../config/db.config.js";
import ResponseService from "../utils/httpService.js";
import { dishModel, dishPortionModel, categoryModel, hotelModel } from "../model/index.js";
import { hotelIdOf, toId, isBlank, toBool, toInt } from "../utils/hotelScope.js";

const UPLOAD_DIR = "uploads";

const removeFile = (filename) => {
    if (!filename) return;
    fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
};

/**
 * Sizes + prices padho. Array bhi chalta hai aur JSON string bhi (multipart form me array nahi bhej sakte).
 * [{ "portion_label": "Half", "price": 150 }, { "portion_label": "Full", "price": 300 }]
 */
const readPortions = (raw) => {
    let list = raw;
    if (typeof raw === "string") {
        try {
            list = JSON.parse(raw);
        } catch {
            return { error: "portions must be a valid JSON array" };
        }
    }
    if (!Array.isArray(list) || list.length === 0) {
        return { error: "At least one size and price is required, e.g. Half 150 and Full 300" };
    }
    const seen = new Set();
    const portions = [];
    for (const [index, p] of list.entries()) {
        const label = String(p?.portion_label ?? "").trim();
        const price = Number(p?.price);
        if (!label || !(price > 0)) return { error: "Every size needs a name and a price above zero" };
        if (seen.has(label.toLowerCase())) return { error: `The size "${label}" is added twice` };
        seen.add(label.toLowerCase());
        portions.push({
            pk_portion_id: toId(p.pk_portion_id),
            portion_label: label,
            price: Math.round(price * 100) / 100,
            sort_order: index,
            status: toBool(p.status, true),
        });
    }
    return { portions };
};

const portionDto = (p) => ({
    pk_portion_id: p.pk_portion_id,
    portion_label: p.portion_label,
    price: Number(p.price),
    sort_order: p.sort_order,
    status: p.status,
});

const dishDto = (dish, portions) => {
    const plain = dish.toJSON();
    return {
        ...plain,
        rating: Number(plain.rating),
        // uploaded photo ho to uska path, warna built-in illustration ka naam
        image_url: plain.image_url ? `/${UPLOAD_DIR}/${plain.image_url}` : null,
        image: plain.image_url ? `/${UPLOAD_DIR}/${plain.image_url}` : (plain.illustration || ""),
        portions: (portions ?? []).map(portionDto),
    };
};

/** Dishes ke saath unke sizes jodta hai (ek hi query me, har dish ke liye alag nahi) */
const withPortions = async (dishes) => {
    if (!dishes.length) return [];
    const rows = await dishPortionModel.findAll({
        where: { fk_dish_id: dishes.map((d) => d.pk_dish_id), is_deleted: false },
        order: [["sort_order", "ASC"], ["pk_portion_id", "ASC"]],
    });
    const byDish = new Map();
    for (const r of rows) byDish.set(r.fk_dish_id, [...(byDish.get(r.fk_dish_id) ?? []), r]);
    return dishes.map((d) => dishDto(d, byDish.get(d.pk_dish_id)));
};

const sameName = (name) => sqlWhere(fn("lower", col("dish_name")), name.trim().toLowerCase());

const create = async (req, res) => {
    const image = req.file;
    try {
        const hotelId = hotelIdOf(req);
        const { fk_category_id, dish_name, description, is_veg, spicy_level, prep_minutes, is_bestseller, is_available, status } = req.body;

        const fail = (fn_, message) => {
            removeFile(image?.filename);
            return fn_(res, message);
        };

        if (!hotelId) return fail(ResponseService.badRequest, "Hotel id is required");
        if (isBlank(dish_name)) return fail(ResponseService.badRequest, "Dish name is required");

        const categoryId = toId(fk_category_id);
        if (!categoryId) return fail(ResponseService.badRequest, "Category is required");

        const spicy = toInt(spicy_level, 0);
        if (spicy < 0 || spicy > 3) return fail(ResponseService.badRequest, "Spicy level must be between 0 and 3");
        const minutes = toInt(prep_minutes, 15);
        if (minutes < 1 || minutes > 240) return fail(ResponseService.badRequest, "Preparation time must be between 1 and 240 minutes");

        const { portions, error } = readPortions(req.body.portions);
        if (error) return fail(ResponseService.badRequest, error);

        const hotel = await hotelModel.findOne({ where: { pk_hotel_id: hotelId, is_deleted: false } });
        if (!hotel) return fail(ResponseService.notFound, "Hotel not found");

        const category = await categoryModel.findOne({ where: { pk_category_id: categoryId, fk_hotel_id: hotelId, is_deleted: false } });
        if (!category) return fail(ResponseService.notFound, "Category not found for this hotel");

        const exists = await dishModel.findOne({
            where: { fk_hotel_id: hotelId, is_deleted: false, [Op.and]: [sameName(dish_name)] },
        });
        if (exists) return fail(ResponseService.conflict, "Dish already exists");

        // dish aur uske sizes saath me save hon, ya dono bilkul nahi
        const dish = await dbConnect.transaction(async (t) => {
            const created = await dishModel.create({
                fk_hotel_id: hotelId,
                fk_category_id: categoryId,
                dish_name: dish_name.trim(),
                description: isBlank(description) ? null : String(description).trim(),
                is_veg: toBool(is_veg, true),
                spicy_level: spicy,
                prep_minutes: minutes,
                is_bestseller: toBool(is_bestseller, false),
                is_available: toBool(is_available, true),
                image_url: image ? image.filename : null,
                illustration: image ? null : (isBlank(req.body.illustration) ? null : String(req.body.illustration).trim().slice(0, 60)),
                status: toBool(status, true),
            }, { transaction: t });

            await dishPortionModel.bulkCreate(
                portions.map(({ pk_portion_id, ...p }) => ({ ...p, fk_dish_id: created.pk_dish_id })),
                { transaction: t },
            );
            return created;
        });

        const [result] = await withPortions([dish]);
        return ResponseService.created(res, "Dish created successfully", result);
    } catch (error) {
        removeFile(image?.filename);
        return ResponseService.error(res, error.message);
    }
};

const list = async (req, res) => {
    try {
        const hotelId = hotelIdOf(req);
        if (!hotelId) return ResponseService.badRequest(res, "Hotel id is required");

        const filter = { fk_hotel_id: hotelId, is_deleted: false };
        const and = [];

        const categoryId = toId(req.query.fk_category_id);
        if (categoryId) filter.fk_category_id = categoryId;
        if (req.query.is_veg !== undefined) filter.is_veg = toBool(req.query.is_veg, true);
        if (req.query.is_available !== undefined) filter.is_available = toBool(req.query.is_available, true);
        if (req.query.status !== undefined) filter.status = toBool(req.query.status, true);
        if (!isBlank(req.query.search)) {
            and.push(sqlWhere(fn("lower", col("dish_name")), { [Op.like]: `%${String(req.query.search).trim().toLowerCase()}%` }));
        }
        if (and.length) filter[Op.and] = and;

        const dishes = await dishModel.findAll({ where: filter, order: [["fk_category_id", "ASC"], ["pk_dish_id", "ASC"]] });
        return ResponseService.success(res, "Dishes retrieved successfully", await withPortions(dishes));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const getById = async (req, res) => {
    try {
        const id = toId(req.params.id);
        const hotelId = hotelIdOf(req);
        if (!id) return ResponseService.badRequest(res, "Valid dish id is required");

        const dish = await dishModel.findOne({ where: { pk_dish_id: id, fk_hotel_id: hotelId, is_deleted: false } });
        if (!dish) return ResponseService.notFound(res, "Dish not found");

        const [result] = await withPortions([dish]);
        return ResponseService.success(res, "Dish retrieved successfully", result);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const update = async (req, res) => {
    const newImage = req.file;
    try {
        const id = toId(req.params.id);
        const hotelId = hotelIdOf(req);
        const fail = (fn_, message) => {
            removeFile(newImage?.filename);
            return fn_(res, message);
        };
        if (!id) return fail(ResponseService.badRequest, "Valid dish id is required");

        const dish = await dishModel.findOne({ where: { pk_dish_id: id, fk_hotel_id: hotelId, is_deleted: false } });
        if (!dish) return fail(ResponseService.notFound, "Dish not found");

        const { fk_category_id, dish_name, description, is_veg, spicy_level, prep_minutes, is_bestseller, is_available, status } = req.body;
        if (isBlank(dish_name)) return fail(ResponseService.badRequest, "Dish name is required");

        let categoryId = dish.fk_category_id;
        if (fk_category_id !== undefined) {
            categoryId = toId(fk_category_id);
            if (!categoryId) return fail(ResponseService.badRequest, "Valid category is required");
            const category = await categoryModel.findOne({ where: { pk_category_id: categoryId, fk_hotel_id: dish.fk_hotel_id, is_deleted: false } });
            if (!category) return fail(ResponseService.notFound, "Category not found for this hotel");
        }

        const spicy = toInt(spicy_level, dish.spicy_level);
        if (spicy < 0 || spicy > 3) return fail(ResponseService.badRequest, "Spicy level must be between 0 and 3");
        const minutes = toInt(prep_minutes, dish.prep_minutes);
        if (minutes < 1 || minutes > 240) return fail(ResponseService.badRequest, "Preparation time must be between 1 and 240 minutes");

        let incoming = null;
        if (req.body.portions !== undefined) {
            const parsed = readPortions(req.body.portions);
            if (parsed.error) return fail(ResponseService.badRequest, parsed.error);
            incoming = parsed.portions;
        }

        const duplicate = await dishModel.findOne({
            where: { fk_hotel_id: dish.fk_hotel_id, is_deleted: false, pk_dish_id: { [Op.ne]: id }, [Op.and]: [sameName(dish_name)] },
        });
        if (duplicate) return fail(ResponseService.conflict, "Dish already exists");

        const oldImage = dish.image_url;
        // illustration chuni gayi aur nayi photo nahi di -> purani photo hata do
        const removeImage = !newImage && toBool(req.body.remove_image, false);
        const illustrationPicked = !newImage && (removeImage || !isBlank(req.body.illustration));

        await dbConnect.transaction(async (t) => {
            await dish.update({
                fk_category_id: categoryId,
                dish_name: dish_name.trim(),
                description: description === undefined ? dish.description : (isBlank(description) ? null : String(description).trim()),
                is_veg: toBool(is_veg, dish.is_veg),
                spicy_level: spicy,
                prep_minutes: minutes,
                is_bestseller: toBool(is_bestseller, dish.is_bestseller),
                is_available: toBool(is_available, dish.is_available),
                status: toBool(status, dish.status),
                image_url: newImage ? newImage.filename : (illustrationPicked ? null : dish.image_url),
                illustration: newImage ? null : (removeImage ? null : req.body.illustration !== undefined ? (isBlank(req.body.illustration) ? null : String(req.body.illustration).trim().slice(0, 60)) : dish.illustration),
            }, { transaction: t });

            // Sizes bheje gaye to list ko DB se match karo: id wale update, naye add, jo list me nahi wo soft delete
            if (incoming) {
                const current = await dishPortionModel.findAll({ where: { fk_dish_id: id, is_deleted: false }, transaction: t });
                const keep = new Set();
                for (const p of incoming) {
                    const match = p.pk_portion_id && current.find((c) => c.pk_portion_id === p.pk_portion_id);
                    if (match) {
                        keep.add(match.pk_portion_id);
                        await match.update({ portion_label: p.portion_label, price: p.price, sort_order: p.sort_order, status: p.status }, { transaction: t });
                    } else {
                        const { pk_portion_id, ...fields } = p;
                        await dishPortionModel.create({ ...fields, fk_dish_id: id }, { transaction: t });
                    }
                }
                for (const c of current) {
                    if (!keep.has(c.pk_portion_id)) await c.update({ is_deleted: true }, { transaction: t });
                }
            }
        });

        if (newImage || illustrationPicked) removeFile(oldImage);

        const [result] = await withPortions([dish]);
        return ResponseService.success(res, "Dish updated successfully", result);
    } catch (error) {
        removeFile(newImage?.filename);
        return ResponseService.error(res, error.message);
    }
};

/** "Sold out today" ek tap me */
const setAvailability = async (req, res) => {
    try {
        const id = toId(req.params.id);
        const hotelId = hotelIdOf(req);
        if (!id) return ResponseService.badRequest(res, "Valid dish id is required");
        if (typeof req.body?.is_available !== "boolean") {
            return ResponseService.badRequest(res, "is_available (true or false) is required");
        }

        const dish = await dishModel.findOne({ where: { pk_dish_id: id, fk_hotel_id: hotelId, is_deleted: false } });
        if (!dish) return ResponseService.notFound(res, "Dish not found");

        await dish.update({ is_available: req.body.is_available });
        return ResponseService.success(res, req.body.is_available ? "Dish is available" : "Dish marked sold out", {
            pk_dish_id: dish.pk_dish_id,
            is_available: dish.is_available,
        });
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const remove = async (req, res) => {
    try {
        const id = toId(req.params.id);
        const hotelId = hotelIdOf(req);
        if (!id) return ResponseService.badRequest(res, "Valid dish id is required");

        const dish = await dishModel.findOne({ where: { pk_dish_id: id, fk_hotel_id: hotelId, is_deleted: false } });
        if (!dish) return ResponseService.notFound(res, "Dish not found");

        await dbConnect.transaction(async (t) => {
            await dish.update({ is_deleted: true }, { transaction: t });
            await dishPortionModel.update({ is_deleted: true }, { where: { fk_dish_id: id }, transaction: t });
        });
        return ResponseService.success(res, "Dish deleted successfully");
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { create, list, getById, update, setAvailability, remove };

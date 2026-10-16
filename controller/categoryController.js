import { Op, fn, col, where as sqlWhere } from "sequelize";
import ResponseService from "../utils/httpService.js";
import { categoryModel, dishModel } from "../model/index.js";
import { hotelIdOf, toId, isBlank } from "../utils/hotelScope.js";

/** Ek hotel me ek naam sirf ek baar (chhote/bade akshar ka fark nahi). */
const sameName = (name) => sqlWhere(fn("lower", col("category_name")), name.trim().toLowerCase());

const create = async (req, res) => {
    try {
        const hotelId = hotelIdOf(req);
        const { category_name, blurb, sort_order, status } = req.body;

        if (!hotelId) return ResponseService.badRequest(res, "Hotel id is required");
        if (isBlank(category_name)) return ResponseService.badRequest(res, "Category name is required");

        const exists = await categoryModel.findOne({
            where: { fk_hotel_id: hotelId, is_deleted: false, [Op.and]: [sameName(category_name)] },
        });
        if (exists) return ResponseService.conflict(res, "Category already exists");

        // sort_order nahi diya to sabse last me
        let order = Number(sort_order);
        if (!Number.isInteger(order)) {
            const last = await categoryModel.max("sort_order", { where: { fk_hotel_id: hotelId, is_deleted: false } });
            order = (last ?? -1) + 1;
        }

        const category = await categoryModel.create({
            fk_hotel_id: hotelId,
            category_name: category_name.trim(),
            blurb: isBlank(blurb) ? null : String(blurb).trim(),
            sort_order: order,
            status: status ?? true,
        });
        return ResponseService.created(res, "Category created successfully", category);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const list = async (req, res) => {
    try {
        const hotelId = hotelIdOf(req);
        if (!hotelId) return ResponseService.badRequest(res, "Hotel id is required");

        const filter = { fk_hotel_id: hotelId, is_deleted: false };
        if (req.query.status !== undefined) filter.status = req.query.status === "true";

        const categories = await categoryModel.findAll({
            where: filter,
            order: [["sort_order", "ASC"], ["pk_category_id", "ASC"]],
        });
        return ResponseService.success(res, "Categories retrieved successfully", categories);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const getById = async (req, res) => {
    try {
        const id = toId(req.params.id);
        const hotelId = hotelIdOf(req);
        if (!id) return ResponseService.badRequest(res, "Valid category id is required");

        const category = await categoryModel.findOne({ where: { pk_category_id: id, fk_hotel_id: hotelId, is_deleted: false } });
        if (!category) return ResponseService.notFound(res, "Category not found");

        return ResponseService.success(res, "Category retrieved successfully", category);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const update = async (req, res) => {
    try {
        const id = toId(req.params.id);
        const hotelId = hotelIdOf(req);
        if (!id) return ResponseService.badRequest(res, "Valid category id is required");

        const category = await categoryModel.findOne({ where: { pk_category_id: id, fk_hotel_id: hotelId, is_deleted: false } });
        if (!category) return ResponseService.notFound(res, "Category not found");

        const { category_name, blurb, sort_order, status } = req.body;
        if (isBlank(category_name)) return ResponseService.badRequest(res, "Category name is required");

        const duplicate = await categoryModel.findOne({
            where: {
                fk_hotel_id: category.fk_hotel_id,
                is_deleted: false,
                pk_category_id: { [Op.ne]: id },
                [Op.and]: [sameName(category_name)],
            },
        });
        if (duplicate) return ResponseService.conflict(res, "Category already exists");

        const order = Number(sort_order);
        await category.update({
            category_name: category_name.trim(),
            blurb: blurb === undefined ? category.blurb : (isBlank(blurb) ? null : String(blurb).trim()),
            sort_order: sort_order !== undefined && Number.isInteger(order) ? order : category.sort_order,
            status: status ?? category.status,
        });
        return ResponseService.success(res, "Category updated successfully", category);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const remove = async (req, res) => {
    try {
        const id = toId(req.params.id);
        const hotelId = hotelIdOf(req);
        if (!id) return ResponseService.badRequest(res, "Valid category id is required");

        const category = await categoryModel.findOne({ where: { pk_category_id: id, fk_hotel_id: hotelId, is_deleted: false } });
        if (!category) return ResponseService.notFound(res, "Category not found");

        // Dishes wali category delete nahi hogi, warna dishes menu se gayab ho jayengi
        const dishCount = await dishModel.count({ where: { fk_category_id: id, is_deleted: false } });
        if (dishCount > 0) {
            return ResponseService.badRequest(res, `This category still has ${dishCount} dish(es). Move or delete them first`);
        }

        await category.update({ is_deleted: true });
        return ResponseService.success(res, "Category deleted successfully");
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { create, list, getById, update, remove };

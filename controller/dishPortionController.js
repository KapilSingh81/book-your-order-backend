import { Op, fn, col, where as sqlWhere } from "sequelize";
import ResponseService from "../utils/httpService.js";
import { dishModel, dishPortionModel } from "../model/index.js";
import { hotelIdOf, toId, isBlank } from "../utils/hotelScope.js";

const sameLabel = (label) => sqlWhere(fn("lower", col("portion_label")), label.trim().toLowerCase());

const readPrice = (value) => {
    const price = Number(value);
    return price > 0 ? Math.round(price * 100) / 100 : null;
};

/** Portion ka dish isi hotel ka hona chahiye */
const ownPortion = async (req, id) => {
    const portion = await dishPortionModel.findOne({ where: { pk_portion_id: id, is_deleted: false } });
    if (!portion) return null;
    const dish = await dishModel.findOne({ where: { pk_dish_id: portion.fk_dish_id, fk_hotel_id: hotelIdOf(req), is_deleted: false } });
    return dish ? portion : null;
};

const dto = (p) => ({ ...p.toJSON(), price: Number(p.price) });

const create = async (req, res) => {
    try {
        const dishId = toId(req.body.fk_dish_id);
        const { portion_label, price, sort_order, status } = req.body;

        if (!dishId) return ResponseService.badRequest(res, "Dish id is required");
        if (isBlank(portion_label)) return ResponseService.badRequest(res, "Size name is required, e.g. Half or Full");
        const amount = readPrice(price);
        if (amount === null) return ResponseService.badRequest(res, "Price must be above zero");

        const dish = await dishModel.findOne({ where: { pk_dish_id: dishId, fk_hotel_id: hotelIdOf(req), is_deleted: false } });
        if (!dish) return ResponseService.notFound(res, "Dish not found");

        const exists = await dishPortionModel.findOne({
            where: { fk_dish_id: dishId, is_deleted: false, [Op.and]: [sameLabel(portion_label)] },
        });
        if (exists) return ResponseService.conflict(res, "This size already exists for the dish");

        let order = Number(sort_order);
        if (!Number.isInteger(order)) {
            const last = await dishPortionModel.max("sort_order", { where: { fk_dish_id: dishId, is_deleted: false } });
            order = (last ?? -1) + 1;
        }

        const portion = await dishPortionModel.create({
            fk_dish_id: dishId,
            portion_label: portion_label.trim(),
            price: amount,
            sort_order: order,
            status: status ?? true,
        });
        return ResponseService.created(res, "Dish size created successfully", dto(portion));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const listByDish = async (req, res) => {
    try {
        const dishId = toId(req.params.dishId);
        if (!dishId) return ResponseService.badRequest(res, "Valid dish id is required");

        const dish = await dishModel.findOne({ where: { pk_dish_id: dishId, fk_hotel_id: hotelIdOf(req), is_deleted: false } });
        if (!dish) return ResponseService.notFound(res, "Dish not found");

        const portions = await dishPortionModel.findAll({
            where: { fk_dish_id: dishId, is_deleted: false },
            order: [["sort_order", "ASC"], ["pk_portion_id", "ASC"]],
        });
        return ResponseService.success(res, "Dish sizes retrieved successfully", portions.map(dto));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const getById = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid size id is required");

        const portion = await ownPortion(req, id);
        if (!portion) return ResponseService.notFound(res, "Dish size not found");

        return ResponseService.success(res, "Dish size retrieved successfully", dto(portion));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const update = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid size id is required");

        const portion = await ownPortion(req, id);
        if (!portion) return ResponseService.notFound(res, "Dish size not found");

        const { portion_label, price, sort_order, status } = req.body;
        if (isBlank(portion_label)) return ResponseService.badRequest(res, "Size name is required");

        let amount = Number(portion.price);
        if (price !== undefined) {
            amount = readPrice(price);
            if (amount === null) return ResponseService.badRequest(res, "Price must be above zero");
        }

        const duplicate = await dishPortionModel.findOne({
            where: {
                fk_dish_id: portion.fk_dish_id,
                is_deleted: false,
                pk_portion_id: { [Op.ne]: id },
                [Op.and]: [sameLabel(portion_label)],
            },
        });
        if (duplicate) return ResponseService.conflict(res, "This size already exists for the dish");

        const order = Number(sort_order);
        await portion.update({
            portion_label: portion_label.trim(),
            price: amount,
            sort_order: sort_order !== undefined && Number.isInteger(order) ? order : portion.sort_order,
            status: status ?? portion.status,
        });
        return ResponseService.success(res, "Dish size updated successfully", dto(portion));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const remove = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid size id is required");

        const portion = await ownPortion(req, id);
        if (!portion) return ResponseService.notFound(res, "Dish size not found");

        // Har dish ke paas kam se kam ek size (price) rehna chahiye, warna wo order nahi ho sakti
        const remaining = await dishPortionModel.count({
            where: { fk_dish_id: portion.fk_dish_id, is_deleted: false, pk_portion_id: { [Op.ne]: id } },
        });
        if (remaining === 0) return ResponseService.badRequest(res, "A dish needs at least one size. Add another size first, or delete the dish");

        await portion.update({ is_deleted: true });
        return ResponseService.success(res, "Dish size deleted successfully");
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { create, listByDish, getById, update, remove };

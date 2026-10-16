import { Op } from "sequelize";
import ResponseService from "../utils/httpService.js";
import { paymentMethodModel } from "../model/index.js";
import { hotelIdOf, toId, isBlank, toBool, toInt } from "../utils/hotelScope.js";

export const methodDto = (m) => ({
    pk_method_id: m.pk_method_id,
    id: m.method_code,
    method_code: m.method_code,
    label: m.method_name,
    method_name: m.method_name,
    hint: m.hint ?? "",
    icon: m.icon ?? "fa-wallet",
    sort_order: m.sort_order,
    status: m.status,
});

const codeOf = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);

const list = async (req, res) => {
    try {
        const where = { fk_hotel_id: hotelIdOf(req), is_deleted: false };
        if (req.query.status !== undefined) where.status = toBool(req.query.status, true);
        const rows = await paymentMethodModel.findAll({ where, order: [["sort_order", "ASC"], ["pk_method_id", "ASC"]] });
        return ResponseService.success(res, "Payment methods retrieved successfully", rows.map(methodDto));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const create = async (req, res) => {
    try {
        const hotelId = hotelIdOf(req);
        const { method_name, hint, icon } = req.body;
        if (isBlank(method_name)) return ResponseService.badRequest(res, "Payment method name is required");
        const code = codeOf(method_name);
        if (!code) return ResponseService.badRequest(res, "Payment method name is not valid");

        if (await paymentMethodModel.findOne({ where: { fk_hotel_id: hotelId, method_code: code, is_deleted: false } })) {
            return ResponseService.conflict(res, "Payment method already exists");
        }
        const last = await paymentMethodModel.max("sort_order", { where: { fk_hotel_id: hotelId, is_deleted: false } });
        const row = await paymentMethodModel.create({
            fk_hotel_id: hotelId,
            method_code: code,
            method_name: method_name.trim(),
            hint: isBlank(hint) ? null : String(hint).trim(),
            icon: isBlank(icon) ? null : String(icon).trim(),
            sort_order: (last ?? -1) + 1,
        });
        return ResponseService.created(res, "Payment method created successfully", methodDto(row));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const update = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid payment method id is required");
        const row = await paymentMethodModel.findOne({ where: { pk_method_id: id, fk_hotel_id: hotelIdOf(req), is_deleted: false } });
        if (!row) return ResponseService.notFound(res, "Payment method not found");

        const { method_name, hint, icon, sort_order, status } = req.body;
        if (method_name !== undefined && isBlank(method_name)) return ResponseService.badRequest(res, "Payment method name is required");
        // code nahi badalta: purane bills me wahi likha hai
        await row.update({
            method_name: method_name === undefined ? row.method_name : method_name.trim(),
            hint: hint === undefined ? row.hint : (isBlank(hint) ? null : String(hint).trim()),
            icon: icon === undefined ? row.icon : (isBlank(icon) ? null : String(icon).trim()),
            sort_order: toInt(sort_order, row.sort_order),
            status: toBool(status, row.status),
        });
        return ResponseService.success(res, "Payment method updated successfully", methodDto(row));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const remove = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid payment method id is required");
        const hotelId = hotelIdOf(req);
        const row = await paymentMethodModel.findOne({ where: { pk_method_id: id, fk_hotel_id: hotelId, is_deleted: false } });
        if (!row) return ResponseService.notFound(res, "Payment method not found");

        const left = await paymentMethodModel.count({
            where: { fk_hotel_id: hotelId, is_deleted: false, status: true, pk_method_id: { [Op.ne]: id } },
        });
        if (left === 0) return ResponseService.badRequest(res, "Keep at least one active payment method");

        await row.update({ is_deleted: true });
        return ResponseService.success(res, "Payment method deleted successfully");
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { list, create, update, remove };

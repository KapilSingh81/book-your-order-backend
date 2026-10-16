import crypto from "crypto";
import { Op } from "sequelize";
import { dbConnect } from "../config/db.config.js";
import ResponseService from "../utils/httpService.js";
import { tableModel, tableSessionModel, orderModel, alertModel } from "../model/index.js";
import { hotelIdOf, toId, toInt, isBlank } from "../utils/hotelScope.js";

const newToken = () => crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8).toLowerCase();

const dto = (t) => ({
    pk_table_id: t.pk_table_id,
    table_number: t.table_number,
    table_label: t.table_label ?? "",
    seats: t.seats,
    qr_token: t.qr_token,
    status: t.status,
});

const own = (req, id) => tableModel.findOne({ where: { pk_table_id: id, fk_hotel_id: hotelIdOf(req), is_deleted: false } });

const list = async (req, res) => {
    try {
        const tables = await tableModel.findAll({
            where: { fk_hotel_id: hotelIdOf(req), is_deleted: false },
            order: [["table_number", "ASC"]],
        });
        return ResponseService.success(res, "Tables retrieved successfully", tables.map(dto));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

/** Table number ki range ek saath: from=1, to=12, seats=4. Jo number pehle se hain wo chhod diye jate hain */
const createRange = async (req, res) => {
    try {
        const hotelId = hotelIdOf(req);
        const from = toInt(req.body.from, null);
        const to = toInt(req.body.to ?? req.body.from, null);
        const seats = toInt(req.body.seats, 4);

        if (from === null || to === null || from < 1 || to < 1) return ResponseService.badRequest(res, "Enter valid table numbers");
        if (Math.abs(to - from) > 100 || Math.max(from, to) >= 500) return ResponseService.badRequest(res, "Add at most 100 tables at a time (numbers below 500)");
        if (seats < 1 || seats > 20) return ResponseService.badRequest(res, "Seats must be between 1 and 20");

        const have = new Set(
            (await tableModel.findAll({ where: { fk_hotel_id: hotelId, is_deleted: false }, attributes: ["table_number"] })).map((t) => t.table_number),
        );
        const rows = [];
        for (let n = Math.min(from, to); n <= Math.max(from, to); n++) {
            if (!have.has(n)) rows.push({ fk_hotel_id: hotelId, table_number: n, seats, qr_token: newToken() });
        }
        if (!rows.length) return ResponseService.conflict(res, "Those tables already exist");

        const created = await tableModel.bulkCreate(rows);
        return ResponseService.created(res, `${created.length} table(s) added`, created.map(dto));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const update = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid table id is required");
        const table = await own(req, id);
        if (!table) return ResponseService.notFound(res, "Table not found");

        const changes = {};
        if (req.body.table_label !== undefined) changes.table_label = isBlank(req.body.table_label) ? null : String(req.body.table_label).trim().slice(0, 24);
        if (req.body.seats !== undefined) {
            const seats = toInt(req.body.seats, null);
            if (seats === null || seats < 1 || seats > 20) return ResponseService.badRequest(res, "Seats must be between 1 and 20");
            changes.seats = seats;
        }
        if (req.body.status !== undefined) changes.status = req.body.status === true || req.body.status === "true";

        await table.update(changes);
        return ResponseService.success(res, "Table updated successfully", dto(table));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

/** Naya secret: purana chhapa hua QR kaam karna band kar dega */
const regenerateToken = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid table id is required");
        const table = await own(req, id);
        if (!table) return ResponseService.notFound(res, "Table not found");
        await table.update({ qr_token: newToken() });
        return ResponseService.success(res, "New QR code generated. Print it and replace the old one", dto(table));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const remove = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid table id is required");
        const table = await own(req, id);
        if (!table) return ResponseService.notFound(res, "Table not found");

        const open = await tableSessionModel.findOne({ where: { fk_table_id: id, closed_at: null } });
        if (open && (await orderModel.count({ where: { fk_session_id: open.pk_session_id } })) > 0) {
            return ResponseService.badRequest(res, "This table has an open order. Close the table first");
        }
        await table.update({ is_deleted: true });
        return ResponseService.success(res, "Table deleted successfully");
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

/**
 * Table khali karo: agle guests ke liye naya session. Jab tak kuch unpaid hai band nahi hoga (force=true ho to hoga)
 */
const closeTable = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid table id is required");
        const table = await own(req, id);
        if (!table) return ResponseService.notFound(res, "Table not found");
        const force = req.body?.force === true || req.body?.force === "true";

        await dbConnect.transaction(async (t) => {
            const session = await tableSessionModel.findOne({ where: { fk_table_id: id, closed_at: null }, transaction: t, lock: t.LOCK.UPDATE });
            if (!session) return;
            if (!force) {
                const unpaid = await orderModel.count({ where: { fk_session_id: session.pk_session_id, fk_bill_id: null, is_void: false }, transaction: t });
                if (unpaid > 0) throw Object.assign(new Error("Some orders on this table are not paid yet"), { code: "UNPAID" });
            }
            await session.update({ closed_at: new Date() }, { transaction: t });
            await alertModel.update(
                { is_done: true, done_at: new Date() },
                { where: { fk_table_id: id, is_done: false }, transaction: t },
            );
        });
        return ResponseService.success(res, "Table is free for the next guests");
    } catch (error) {
        if (error.code === "UNPAID") return ResponseService.badRequest(res, error.message);
        return ResponseService.error(res, error.message);
    }
};

export { list, createRange, update, regenerateToken, remove, closeTable };

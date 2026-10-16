import { Op } from "sequelize";
import ResponseService from "../utils/httpService.js";
import { tableModel, billModel, orderModel, orderItemModel, guestModel } from "../model/index.js";
import { hotelIdOf, toInt, isBlank } from "../utils/hotelScope.js";
import { payBill } from "../services/billing.js";
import { receiptDto, startOfToday } from "../utils/serialize.js";

/** Counter se payment: ek guest ka alag bill (guest_id) ya poore table ka (guest_id na bhejo) */
const pay = async (req, res) => {
    try {
        const hotelId = hotelIdOf(req);
        const number = toInt(req.body.table_number, null);
        if (!number) return ResponseService.badRequest(res, "Table number is required");
        const table = await tableModel.findOne({ where: { fk_hotel_id: hotelId, table_number: number, is_deleted: false } });
        if (!table) return ResponseService.notFound(res, "Table not found");

        const result = await payBill({
            hotelId, tableId: table.pk_table_id,
            guestClientId: isBlank(req.body.guest_id) ? null : String(req.body.guest_id),
            methodCode: req.body.method, staffId: req.user.pk_staff_id,
        });
        if (result.error) return ResponseService.badRequest(res, result.error);
        return ResponseService.created(res, "Payment recorded", result.receipt);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

/** Bills ki history. ?from=YYYY-MM-DD&to=YYYY-MM-DD (default: aaj) */
const history = async (req, res) => {
    try {
        const hotelId = hotelIdOf(req);
        const day = (v, endOfDay) => {
            if (isBlank(v) || !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return null;
            const d = new Date(`${v}T00:00:00`);
            if (isNaN(d)) return null;
            if (endOfDay) d.setHours(23, 59, 59, 999);
            return d;
        };
        const from = day(req.query.from, false) ?? startOfToday();
        const to = day(req.query.to, true) ?? new Date();

        const bills = await billModel.findAll({
            where: { fk_hotel_id: hotelId, paid_at: { [Op.between]: [from, to] } },
            order: [["pk_bill_id", "DESC"]],
            limit: 500,
        });
        const tables = await tableModel.findAll({ where: { fk_hotel_id: hotelId } });
        const tableNo = new Map(tables.map((t) => [t.pk_table_id, t.table_number]));
        const orders = bills.length
            ? await orderModel.findAll({ where: { fk_bill_id: bills.map((b) => b.pk_bill_id) }, include: [{ model: orderItemModel, as: "items" }] })
            : [];
        const guestIds = [...new Set(bills.map((b) => b.fk_guest_id).filter(Boolean))];
        const guests = guestIds.length ? await guestModel.findAll({ where: { pk_guest_id: guestIds } }) : [];
        const clientIds = new Map(guests.map((g) => [g.pk_guest_id, g.client_id]));

        const data = bills.map((b) =>
            receiptDto(b, tableNo.get(b.fk_table_id) ?? 0, orders.filter((o) => o.fk_bill_id === b.pk_bill_id), (id) => clientIds.get(id) ?? null));
        const sales = data.reduce((s, r) => s + r.totals.total, 0);
        return ResponseService.success(res, "Bills retrieved successfully", {
            from, to, count: data.length, sales: Math.round(sales * 100) / 100, bills: data,
        });
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { pay, history };

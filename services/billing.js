import { dbConnect } from "../config/db.config.js";
import {
    hotelModel, tableModel, tableSessionModel, guestModel, orderModel, orderItemModel,
    billModel, alertModel, paymentMethodModel,
} from "../model/index.js";
import { receiptDto, totalsOf } from "../utils/serialize.js";

export const guestLabel = (g) => (g.guest_name || "").trim() || (g.seat ? `Seat ${g.seat}` : "Guest");

/**
 * Bill banao aur un orders ko paid mark karo.
 * guestClientId = ek guest ka alag bill, null = poore table ka ek bill.
 * Return: { receipt } ya { error: "message" }
 */
export const payBill = async ({ hotelId, tableId, guestClientId = null, methodCode, staffId = null }) => {
    try {
        return await dbConnect.transaction(async (t) => {
            const session = await tableSessionModel.findOne({
                where: { fk_table_id: tableId, fk_hotel_id: hotelId, closed_at: null },
                transaction: t, lock: t.LOCK.UPDATE,
            });
            if (!session) return { error: "There is nothing to pay on this table" };

            const method = await paymentMethodModel.findOne({
                where: { fk_hotel_id: hotelId, method_code: String(methodCode ?? ""), is_deleted: false, status: true },
                transaction: t,
            });
            if (!method) return { error: "Choose a valid payment method" };

            let guest = null;
            const where = { fk_session_id: session.pk_session_id, fk_bill_id: null, is_void: false };
            if (guestClientId) {
                guest = await guestModel.findOne({ where: { fk_session_id: session.pk_session_id, client_id: guestClientId }, transaction: t });
                if (!guest) return { error: "This guest has nothing to pay" };
                where.fk_guest_id = guest.pk_guest_id;
            }

            const orders = await orderModel.findAll({ where, include: [{ model: orderItemModel, as: "items" }], transaction: t });
            const subtotal = orders.reduce((s, o) => s + o.items.reduce((n, i) => n + Number(i.price) * i.qty, 0), 0);
            if (!orders.length || subtotal <= 0) return { error: "There is nothing to pay" };

            const hotel = await hotelModel.findOne({ where: { pk_hotel_id: hotelId }, transaction: t, lock: t.LOCK.UPDATE });
            const rate = Number(hotel.tax_rate);
            const totals = totalsOf(subtotal, rate);
            const seq = hotel.bill_seq + 1;
            await hotel.update({ bill_seq: seq }, { transaction: t });

            const bill = await billModel.create({
                bill_no: `${new Date().getFullYear()}-${seq}`,
                fk_hotel_id: hotelId, fk_table_id: tableId, fk_session_id: session.pk_session_id,
                fk_guest_id: guest?.pk_guest_id ?? null,
                guest_name: guest ? guestLabel(guest) : "",
                method_code: method.method_code, method_name: method.method_name,
                subtotal: totals.subtotal, tax_rate: rate, tax: totals.tax, total: totals.total,
                paid_at: new Date(), fk_staff_id: staffId,
            }, { transaction: t });

            await orderModel.update({ fk_bill_id: bill.pk_bill_id }, { where: { pk_order_id: orders.map((o) => o.pk_order_id) }, transaction: t });

            const left = await orderModel.count({ where: { fk_session_id: session.pk_session_id, fk_bill_id: null, is_void: false }, transaction: t });
            if (left === 0) {
                await alertModel.update(
                    { is_done: true, done_at: new Date() },
                    { where: { fk_table_id: tableId, type: "bill", is_done: false }, transaction: t },
                );
            }

            const table = await tableModel.findOne({ where: { pk_table_id: tableId }, transaction: t });
            return { receipt: receiptDto(bill, table.table_number, orders, () => guestClientId) };
        });
    } catch (e) {
        return { error: e.message };
    }
};

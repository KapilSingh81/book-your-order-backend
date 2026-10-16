import { Op } from "sequelize";
import { orderModel, orderItemModel, guestModel, billModel, alertModel, tableModel, tableSessionModel } from "../model/index.js";
import { money } from "./hotelScope.js";

export const orderLabel = (no) => `BYO-${no}`;

const lineDto = (i) => ({
    id: String(i.fk_dish_id),
    p: String(i.fk_portion_id),
    name: i.dish_name,
    portion: i.portion_label,
    price: Number(i.price),
    qty: i.qty,
    veg: i.is_veg,
});

/** Order -> customer/counter screens ka format. `id` dikhne wala number (BYO-1042), `pk` asli id */
export const orderDto = (o, tableNo, billNo = null) => ({
    pk: o.pk_order_id,
    id: orderLabel(o.order_no),
    table: tableNo,
    session: o.fk_session_id,
    round: o.round,
    createdAt: new Date(o.createdAt).getTime(),
    lines: (o.items ?? []).map(lineDto),
    note: o.note ?? "",
    guest: { id: o.guest?.client_id ?? "", name: o.guest?.guest_name ?? "", seat: o.guest?.seat ?? null },
    status: o.status,
    statusAt: new Date(o.status_at).getTime(),
    paidBill: billNo || undefined,
    viaQr: o.via_qr,
    seen: !!o.seen_at,
    geo: o.geo_state ?? "na",
    geoDistance: o.geo_distance_m ?? null,
    voided: !!o.is_void,
    voidReason: o.void_reason ?? "",
});

/** Ek hi dish + size ki lines jod do */
export const mergeLines = (orders) => {
    const merged = new Map();
    for (const o of orders) {
        for (const l of o.items ?? []) {
            const key = `${l.fk_dish_id}|${l.fk_portion_id}`;
            const prev = merged.get(key);
            if (prev) prev.qty += l.qty;
            else merged.set(key, lineDto(l));
        }
    }
    return [...merged.values()];
};

export const totalsOf = (subtotal, rate) => {
    const tax = money(subtotal * rate);
    return { subtotal: money(subtotal), tax, total: money(subtotal + tax) };
};

export const receiptDto = (b, tableNo, orders, clientIdOf) => ({
    billNo: b.bill_no,
    table: tableNo,
    session: b.fk_session_id,
    guestId: b.fk_guest_id ? clientIdOf(b.fk_guest_id) : null,
    guestName: b.guest_name,
    orderIds: orders.map((o) => orderLabel(o.order_no)),
    paidAt: new Date(b.paid_at).getTime(),
    method: b.method_code,
    methodName: b.method_name,
    lines: mergeLines(orders),
    totals: { subtotal: Number(b.subtotal), tax: Number(b.tax), total: Number(b.total) },
});

/**
 * Live snapshot. sessionIds = jin sessions ke orders chahiye. sinceDay = aaj ke bills bhi (sales ke liye).
 * Customer ke liye ek table, staff ke liye poora hotel.
 */
export const snapshot = async ({ hotelId, tableIds = null, includeTodayBills = false }) => {
    const tableWhere = { fk_hotel_id: hotelId, is_deleted: false };
    if (tableIds) tableWhere.pk_table_id = tableIds;
    const tables = await tableModel.findAll({ where: tableWhere });
    const tableNo = new Map(tables.map((t) => [t.pk_table_id, t.table_number]));

    const sessions = await tableSessionModel.findAll({
        where: { fk_hotel_id: hotelId, closed_at: null, fk_table_id: [...tableNo.keys()] },
    });
    const sessionByTable = {};
    for (const s of sessions) sessionByTable[tableNo.get(s.fk_table_id)] = s.pk_session_id;
    const sessionIds = sessions.map((s) => s.pk_session_id);

    const orders = sessionIds.length
        ? await orderModel.findAll({
            where: { fk_session_id: sessionIds },
            include: [{ model: orderItemModel, as: "items" }, { model: guestModel, as: "guest" }],
            order: [["pk_order_id", "ASC"]],
        })
        : [];

    const billWhere = includeTodayBills
        ? { fk_hotel_id: hotelId, [Op.or]: [{ fk_session_id: sessionIds }, { paid_at: { [Op.gte]: startOfToday() } }] }
        : { fk_hotel_id: hotelId, fk_session_id: sessionIds };
    const bills = sessionIds.length || includeTodayBills ? await billModel.findAll({ where: billWhere, order: [["pk_bill_id", "ASC"]] }) : [];
    const billNoById = new Map(bills.map((b) => [b.pk_bill_id, b.bill_no]));

    // Bills ke orders (aaj ke purane sessions ke bhi)
    const billOrders = bills.length
        ? await orderModel.findAll({
            where: { fk_bill_id: bills.map((b) => b.pk_bill_id) },
            include: [{ model: orderItemModel, as: "items" }],
        })
        : [];
    const ordersByBill = new Map();
    for (const o of billOrders) ordersByBill.set(o.fk_bill_id, [...(ordersByBill.get(o.fk_bill_id) ?? []), o]);

    const guestIds = [...new Set(bills.map((b) => b.fk_guest_id).filter(Boolean))];
    const guests = guestIds.length ? await guestModel.findAll({ where: { pk_guest_id: guestIds } }) : [];
    const clientIds = new Map(guests.map((g) => [g.pk_guest_id, g.client_id]));

    const alerts = await alertModel.findAll({
        where: { fk_hotel_id: hotelId, is_done: false, fk_table_id: [...tableNo.keys()] },
        order: [["pk_alert_id", "ASC"]],
    });

    return {
        sessions: sessionByTable,
        orders: orders.map((o) => orderDto(o, tableNo.get(o.fk_table_id), billNoById.get(o.fk_bill_id))),
        receipts: bills.map((b) =>
            receiptDto(b, tableNo.get(b.fk_table_id) ?? 0, ordersByBill.get(b.pk_bill_id) ?? [], (id) => clientIds.get(id) ?? null)),
        alerts: alerts.map((a) => ({
            id: String(a.pk_alert_id),
            type: a.type,
            table: tableNo.get(a.fk_table_id),
            guestName: a.guest_name,
            at: new Date(a.createdAt).getTime(),
            done: false,
        })),
    };
};

export const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

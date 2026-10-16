import crypto from "crypto";
import { Op } from "sequelize";
import { dbConnect } from "../config/db.config.js";
import ResponseService from "../utils/httpService.js";
import {
    hotelModel, categoryModel, dishModel, dishPortionModel, tableModel, tableSessionModel,
    guestModel, orderModel, orderItemModel, billModel, alertModel, paymentMethodModel,
} from "../model/index.js";
import { toInt, isBlank, money } from "../utils/hotelScope.js";
import { hotelDto } from "./hotelController.js";
import { methodDto } from "./paymentMethodController.js";
import { snapshot, orderDto } from "../utils/serialize.js";
import { payBill, guestLabel } from "../services/billing.js";
import { notifyNewOrder, notifyAlert } from "../services/push.js";

const UPLOAD_DIR = "uploads";
const MAX_LINES = 40;
const MAX_QTY = 30;

const requireQr = () => String(process.env.REQUIRE_QR_TOKEN ?? "true").toLowerCase() !== "false";
const customerPayOn = () => String(process.env.ALLOW_CUSTOMER_PAY ?? "false").toLowerCase() === "true";

const sameToken = (a, b) => {
    const x = Buffer.from(String(a ?? ""));
    const y = Buffer.from(String(b ?? ""));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Hotel + table dhoondo aur QR ka secret check karo. Galat ho to { error: [fn, message] } */
const resolveTable = async (slug, number, token, { needTable = true } = {}) => {
    const hotel = await hotelModel.findOne({ where: { hotel_slug: String(slug), is_deleted: false } });
    if (!hotel) return { error: [ResponseService.notFound, "Hotel not found"] };
    if (!needTable) return { hotel };

    const n = toInt(number, null);
    if (!n) return { error: [ResponseService.badRequest, "Table number is required"] };
    const table = await tableModel.findOne({ where: { fk_hotel_id: hotel.pk_hotel_id, table_number: n, is_deleted: false, status: true } });
    if (!table) return { error: [ResponseService.notFound, `Table ${n} does not exist at this hotel`] };
    if (requireQr() && !sameToken(token, table.qr_token)) {
        return { error: [ResponseService.forbidden, "This QR code is no longer valid. Please scan the QR on your table again"] };
    }
    return { hotel, table };
};

const metersBetween = (la1, lo1, la2, lo2) => {
    const R = 6371000, rad = (d) => (d * Math.PI) / 180;
    const a = Math.sin(rad(la2 - la1) / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

/**
 * Customer hotel ke andar hai ya nahi. geo_mode: off = check nahi, warn = order jata hai par flag lagta hai, block = order roka jata hai.
 * GPS ki galti (accuracy) radius me jod di jaati hai (max 100 m) taaki andar baitha customer galti se na rukey.
 * Return { state: na|ok|outside|unknown, distance, blocked: "message" }
 */
const checkGeo = (hotel, geo) => {
    if (hotel.geo_mode === "off" || hotel.latitude === null || hotel.longitude === null) return { state: "na", distance: null };
    const la = Number(geo?.lat), lo = Number(geo?.lng);
    if (!geo || !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
        return {
            state: "unknown", distance: null,
            blocked: hotel.geo_mode === "block" ? "Please allow location access so we can confirm you are at the hotel, then place your order again" : null,
        };
    }
    const acc = Math.min(Math.max(Number(geo.acc) || 0, 0), 100);
    const distance = metersBetween(la, lo, Number(hotel.latitude), Number(hotel.longitude));
    if (distance <= hotel.geo_radius_m + acc) return { state: "ok", distance };
    return {
        state: "outside", distance,
        blocked: hotel.geo_mode === "block" ? "You seem to be away from the hotel. Orders can only be placed from inside. Please ask the staff for help" : null,
    };
};

const portionOut = (p) => ({ id: String(p.pk_portion_id), label: p.portion_label, price: Number(p.price) });

/**
 * Customer ka menu. Unavailable dishes bhi aate hain (available: false) taaki "Currently unavailable" dikhe,
 * lekin order nahi ho sakta.
 */
const menu = async (req, res) => {
    try {
        const hotel = await hotelModel.findOne({ where: { hotel_slug: req.params.slug, is_deleted: false } });
        if (!hotel) return ResponseService.notFound(res, "Hotel not found");
        const hotelId = hotel.pk_hotel_id;

        const categories = await categoryModel.findAll({
            where: { fk_hotel_id: hotelId, is_deleted: false, status: true },
            order: [["sort_order", "ASC"], ["pk_category_id", "ASC"]],
        });
        const dishes = await dishModel.findAll({
            where: { fk_hotel_id: hotelId, is_deleted: false, status: true, fk_category_id: categories.map((c) => c.pk_category_id) },
            order: [["pk_dish_id", "ASC"]],
        });
        const portions = dishes.length
            ? await dishPortionModel.findAll({
                where: { fk_dish_id: dishes.map((d) => d.pk_dish_id), is_deleted: false, status: true },
                order: [["sort_order", "ASC"], ["pk_portion_id", "ASC"]],
            })
            : [];
        const byDish = new Map();
        for (const p of portions) byDish.set(p.fk_dish_id, [...(byDish.get(p.fk_dish_id) ?? []), p]);

        const tables = await tableModel.findAll({
            where: { fk_hotel_id: hotelId, is_deleted: false, status: true },
            attributes: ["table_number", "table_label", "seats"],
            order: [["table_number", "ASC"]],
        });
        const methods = await paymentMethodModel.findAll({
            where: { fk_hotel_id: hotelId, is_deleted: false, status: true },
            order: [["sort_order", "ASC"], ["pk_method_id", "ASC"]],
        });

        return ResponseService.success(res, "Menu retrieved successfully", {
            hotel: hotelDto(hotel),
            categories: categories.map((c) => ({ id: String(c.pk_category_id), name: c.category_name, blurb: c.blurb ?? "" })),
            dishes: dishes
                .filter((d) => (byDish.get(d.pk_dish_id) ?? []).length > 0)
                .map((d) => ({
                    id: String(d.pk_dish_id),
                    name: d.dish_name,
                    desc: d.description ?? "",
                    category: String(d.fk_category_id),
                    veg: d.is_veg,
                    rating: Number(d.rating),
                    votes: d.votes,
                    minutes: d.prep_minutes,
                    spicy: d.spicy_level,
                    bestseller: d.is_bestseller,
                    available: d.is_available,
                    portions: byDish.get(d.pk_dish_id).map(portionOut),
                    image: d.image_url ? `/${UPLOAD_DIR}/${d.image_url}` : (d.illustration || ""),
                })),
            tables: tables.map((t) => ({ number: t.table_number, name: t.table_label ?? "", seats: t.seats })),
            payment_methods: methods.map(methodDto),
            settings: { customerPay: customerPayOn(), requireQr: requireQr() },
        });
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

/** Is table ke orders, bills, alerts (customer screens ko live rakhne ke liye polling) */
const tableState = async (req, res) => {
    try {
        const { hotel, table, error } = await resolveTable(req.params.slug, req.params.number, req.query.k);
        if (error) return error[0](res, error[1]);
        const data = await snapshot({ hotelId: hotel.pk_hotel_id, tableIds: [table.pk_table_id] });
        return ResponseService.success(res, "Success", data);
    } catch (e) {
        return ResponseService.error(res, e.message);
    }
};

const cleanGuest = (g) => {
    const id = String(g?.id ?? "").trim();
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return null;
    const seat = toInt(g?.seat, null);
    return { id, name: String(g?.name ?? "").trim().slice(0, 60), seat: seat && seat > 0 && seat <= 50 ? seat : null };
};

/** Session (table par abhi baithe log) dhoondo, nahi hai to naya banao */
export const openSession = async (hotelId, tableId, t) => {
    // table row lock: do phone ek saath order karein to do session na ban jayein
    await tableModel.findOne({ where: { pk_table_id: tableId }, transaction: t, lock: t.LOCK.UPDATE });
    const open = await tableSessionModel.findOne({ where: { fk_table_id: tableId, closed_at: null }, transaction: t });
    return open ?? tableSessionModel.create({ fk_hotel_id: hotelId, fk_table_id: tableId }, { transaction: t });
};

/**
 * Customer order bhejta hai. Dish unavailable ho to poora order nahi jata aur batata hai kaun si dish.
 * body: { guest:{id,name,seat}, note, items:[{ dish_id, portion_id, qty }] }
 */
const placeOrder = async (req, res) => {
    try {
        const { hotel, table, error } = await resolveTable(req.params.slug, req.body.table, req.body.k);
        if (error) return error[0](res, error[1]);

        const guest = cleanGuest(req.body.guest);
        if (!guest) return ResponseService.badRequest(res, "Guest id is missing. Please reload the page");

        // Retry safe: ye wahi order dobara aaya (network toota tha) to naya mat banao, purana wapas do
        const requestId = /^[A-Za-z0-9_-]{8,64}$/.test(String(req.body.request_id ?? "")) ? String(req.body.request_id) : null;
        const findOrder = (where) => orderModel.findOne({
            where, include: [{ model: orderItemModel, as: "items" }, { model: guestModel, as: "guest" }],
        });
        if (requestId) {
            const again = await findOrder({ fk_hotel_id: hotel.pk_hotel_id, client_request_id: requestId });
            if (again) return ResponseService.success(res, "Order already received", orderDto(again, table.table_number));
        }

        const geo = checkGeo(hotel, req.body.geo);
        if (geo.blocked) return ResponseService.forbidden(res, geo.blocked);

        const raw = Array.isArray(req.body.items) ? req.body.items : [];
        if (!raw.length) return ResponseService.badRequest(res, "Your cart is empty");
        if (raw.length > MAX_LINES) return ResponseService.badRequest(res, `You can order at most ${MAX_LINES} different items at once`);

        const wanted = new Map();
        for (const r of raw) {
            const dishId = toInt(r?.dish_id, null);
            const portionId = toInt(r?.portion_id, null);
            const qty = toInt(r?.qty, null);
            if (!dishId || !portionId || !qty || qty < 1 || qty > MAX_QTY) {
                return ResponseService.badRequest(res, `Every item needs a dish, a size and a quantity from 1 to ${MAX_QTY}`);
            }
            const key = `${dishId}|${portionId}`;
            const prev = wanted.get(key);
            wanted.set(key, { dishId, portionId, qty: Math.min(MAX_QTY, (prev?.qty ?? 0) + qty) });
        }

        const hotelId = hotel.pk_hotel_id;
        const dishes = await dishModel.findAll({
            where: { pk_dish_id: [...new Set([...wanted.values()].map((w) => w.dishId))], fk_hotel_id: hotelId, is_deleted: false, status: true },
        });
        const dishById = new Map(dishes.map((d) => [d.pk_dish_id, d]));
        const portions = await dishPortionModel.findAll({
            where: { pk_portion_id: [...new Set([...wanted.values()].map((w) => w.portionId))], is_deleted: false, status: true },
        });
        const portionById = new Map(portions.map((p) => [p.pk_portion_id, p]));

        const unavailable = [];
        const lines = [];
        for (const w of wanted.values()) {
            const dish = dishById.get(w.dishId);
            const portion = portionById.get(w.portionId);
            if (!dish || !portion || portion.fk_dish_id !== dish.pk_dish_id) {
                return ResponseService.badRequest(res, "Some items in your cart are no longer on the menu. Please refresh the menu");
            }
            if (!dish.is_available) unavailable.push(dish.dish_name);
            else lines.push({ dish, portion, qty: w.qty });
        }
        if (unavailable.length) {
            const names = [...new Set(unavailable)].join(", ");
            return ResponseService.conflict(res, `${names} ${unavailable.length > 1 ? "are" : "is"} currently unavailable. Please remove ${unavailable.length > 1 ? "them" : "it"} from your cart`);
        }

        const note = isBlank(req.body.note) ? null : String(req.body.note).trim().slice(0, 200);

        const orderId = await dbConnect.transaction(async (t) => {
            const session = await openSession(hotelId, table.pk_table_id, t);

            let g = await guestModel.findOne({ where: { fk_session_id: session.pk_session_id, client_id: guest.id }, transaction: t });
            if (g) await g.update({ guest_name: guest.name || g.guest_name, seat: guest.seat ?? g.seat }, { transaction: t });
            else g = await guestModel.create({ fk_session_id: session.pk_session_id, client_id: guest.id, guest_name: guest.name, seat: guest.seat }, { transaction: t });

            const round = (await orderModel.count({ where: { fk_session_id: session.pk_session_id, fk_guest_id: g.pk_guest_id }, transaction: t })) + 1;

            // order number: hotel row lock karke +1, taaki do order ko ek number na mile
            const h = await hotelModel.findOne({ where: { pk_hotel_id: hotelId }, transaction: t, lock: t.LOCK.UPDATE });
            const orderNo = h.order_seq + 1;
            await h.update({ order_seq: orderNo }, { transaction: t });

            const order = await orderModel.create({
                order_no: orderNo, fk_hotel_id: hotelId, fk_table_id: table.pk_table_id, fk_session_id: session.pk_session_id,
                fk_guest_id: g.pk_guest_id, round, note, status: "placed", status_at: new Date(), via_qr: !!req.body.k,
                client_request_id: requestId, geo_state: geo.state, geo_distance_m: geo.distance,
            }, { transaction: t });

            await orderItemModel.bulkCreate(lines.map((l) => ({
                fk_order_id: order.pk_order_id,
                fk_dish_id: l.dish.pk_dish_id,
                fk_portion_id: l.portion.pk_portion_id,
                dish_name: l.dish.dish_name,
                portion_label: l.portion.portion_label,
                price: l.portion.price,
                qty: l.qty,
                is_veg: l.dish.is_veg,
            })), { transaction: t });
            return order.pk_order_id;
        });

        const order = await findOrder({ pk_order_id: orderId });
        void notifyNewOrder(hotelId, order, table.table_number, guestLabel(order.guest), geo.state);
        return ResponseService.created(res, "Order placed", orderDto(order, table.table_number));
    } catch (e) {
        // Do request ek saath aayi aur dusri unique index par takrayi: pehle wala order wapas do
        if (e.name === "SequelizeUniqueConstraintError" && req.body?.request_id) {
            const hotel = await hotelModel.findOne({ where: { hotel_slug: String(req.params.slug) } });
            const again = hotel && await orderModel.findOne({
                where: { fk_hotel_id: hotel.pk_hotel_id, client_request_id: String(req.body.request_id) },
                include: [{ model: orderItemModel, as: "items" }, { model: guestModel, as: "guest" }],
            });
            if (again) {
                const t = await tableModel.findOne({ where: { pk_table_id: again.fk_table_id } });
                return ResponseService.success(res, "Order already received", orderDto(again, t?.table_number ?? 0));
            }
        }
        return ResponseService.error(res, e.message);
    }
};

/** "Waiter bulao" / "Bill chahiye" */
const raiseAlert = async (req, res) => {
    try {
        const { hotel, table, error } = await resolveTable(req.params.slug, req.body.table, req.body.k);
        if (error) return error[0](res, error[1]);

        const type = req.body.type;
        if (!["waiter", "bill"].includes(type)) return ResponseService.badRequest(res, "type must be waiter or bill");

        const session = await tableSessionModel.findOne({ where: { fk_table_id: table.pk_table_id, closed_at: null } });
        const dup = await alertModel.findOne({ where: { fk_table_id: table.pk_table_id, type, is_done: false } });
        if (!dup) {
            await alertModel.create({
                fk_hotel_id: hotel.pk_hotel_id, fk_table_id: table.pk_table_id, fk_session_id: session?.pk_session_id ?? null,
                type, guest_name: String(req.body.guest_name ?? "").trim().slice(0, 60),
            });
            void notifyAlert(hotel.pk_hotel_id, type, table.table_number, String(req.body.guest_name ?? "").trim().slice(0, 60));
        }
        return ResponseService.success(res, type === "bill" ? "The counter knows you are ready to pay" : "A waiter is on the way");
    } catch (e) {
        return ResponseService.error(res, e.message);
    }
};

/** Sirf ALLOW_CUSTOMER_PAY=true par (demo / payment gateway ke baad). Warna counter hi payment leta hai */
const customerPay = async (req, res) => {
    try {
        if (!customerPayOn()) return ResponseService.forbidden(res, "Please pay at the counter");
        const { hotel, table, error } = await resolveTable(req.params.slug, req.body.table, req.body.k);
        if (error) return error[0](res, error[1]);

        const scope = req.body.scope === "table" ? null : String(req.body.guest_id ?? "");
        if (scope !== null && !scope) return ResponseService.badRequest(res, "Guest id is required");

        const result = await payBill({ hotelId: hotel.pk_hotel_id, tableId: table.pk_table_id, guestClientId: scope, methodCode: req.body.method, staffId: null });
        if (result.error) return ResponseService.badRequest(res, result.error);
        return ResponseService.created(res, "Payment received", result.receipt);
    } catch (e) {
        return ResponseService.error(res, e.message);
    }
};

export { menu, tableState, placeOrder, raiseAlert, customerPay };

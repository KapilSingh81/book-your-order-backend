import webpush from "web-push";
import { Op } from "sequelize";
import { pushSubscriptionModel, orderModel, tableModel } from "../model/index.js";
import { orderLabel } from "../utils/serialize.js";

const pub = () => process.env.VAPID_PUBLIC_KEY || "";
let ready = false;

/** VAPID keys .env me ho to push chalu, warna chup-chap band (baaki app chalti rahegi) */
export const initPush = () => {
    if (!pub() || !process.env.VAPID_PRIVATE_KEY) {
        console.log("Push notifications are OFF (VAPID keys missing in .env)");
        return;
    }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub(), process.env.VAPID_PRIVATE_KEY);
    ready = true;
    console.log("Push notifications are ON");
};

export const pushPublicKey = () => (ready ? pub() : "");

/**
 * Hotel ke staff ko notification bhejo. roles: kin logon ko (owner hamesha)
 * Kharab / purane device (404, 410) apne aap hat jate hain.
 */
export const notifyStaff = async (hotelId, payload, roles = ["counter", "kitchen"]) => {
    if (!ready) return;
    try {
        const subs = await pushSubscriptionModel.findAll({ where: { fk_hotel_id: hotelId, role: [...roles, "owner"] } });
        // Angular service worker ka format: { notification: {...} }. Click par app (ya naya tab) us page par khulta hai
        const body = JSON.stringify({
            notification: {
                title: payload.title, body: payload.body, tag: payload.tag,
                icon: "/icons/icon-192.png", badge: "/icons/icon-192.png",
                vibrate: [200, 100, 200, 100, 300], requireInteraction: payload.kind !== "alert", renotify: true,
                data: { kind: payload.kind, onActionClick: { default: { operation: "navigateLastFocusedOrOpen", url: payload.url } } },
            },
        });
        await Promise.all(subs.map(async (s) => {
            try {
                await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 30, urgency: "high" });
            } catch (e) {
                if (e.statusCode === 404 || e.statusCode === 410) await s.destroy();
            }
        }));
    } catch (e) {
        console.log("push failed:", e.message);
    }
};

export const notifyNewOrder = (hotelId, order, tableNo, guestLabel, geoState) =>
    notifyStaff(hotelId, {
        title: `New order ${orderLabel(order.order_no)} - Table ${tableNo}`,
        body: `${guestLabel}${geoState === "outside" ? " - location looks OUTSIDE the hotel" : ""}`,
        url: "/staff/counter", tag: `order-${order.pk_order_id}`, kind: "order",
    });

export const notifyAlert = (hotelId, type, tableNo, guestName) =>
    notifyStaff(hotelId, {
        title: type === "bill" ? `Table ${tableNo} wants the bill` : `Table ${tableNo} is calling a waiter`,
        body: guestName || "A guest at the table",
        url: "/staff/counter", tag: `alert-${type}-${tableNo}`, kind: "alert",
    }, ["counter"]);

/**
 * Har kuch der me chalao: jo order STALE_ORDER_MIN minute se "placed" hai aur kisi ne start nahi kiya,
 * uske liye staff ko dubara push (ek order ke liye ek hi baar).
 */
export const checkStaleOrders = async () => {
    if (!ready) return;
    const mins = Number(process.env.STALE_ORDER_MIN || 3);
    const stale = await orderModel.findAll({
        where: { status: "placed", is_void: false, stale_notified_at: null, createdAt: { [Op.lt]: new Date(Date.now() - mins * 60_000) } },
        limit: 50,
    });
    for (const o of stale) {
        const table = await tableModel.findOne({ where: { pk_table_id: o.fk_table_id } });
        await o.update({ stale_notified_at: new Date() });
        await notifyStaff(o.fk_hotel_id, {
            title: `Order ${orderLabel(o.order_no)} is waiting`,
            body: `Table ${table?.table_number ?? "?"} - nobody has started it for ${mins}+ minutes`,
            url: "/staff/kitchen", tag: `stale-${o.pk_order_id}`, kind: "stale",
        });
    }
};

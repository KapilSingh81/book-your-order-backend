import ResponseService from "../utils/httpService.js";
import { pushSubscriptionModel } from "../model/index.js";
import { pushPublicKey } from "../services/push.js";

/** Browser ko push ke liye ye public key chahiye. Khali = server par push band */
const key = (req, res) => ResponseService.success(res, "Success", { publicKey: pushPublicKey() });

const subscribe = async (req, res) => {
    try {
        const s = req.body?.subscription ?? req.body;
        const endpoint = String(s?.endpoint ?? "");
        const p256dh = String(s?.keys?.p256dh ?? "");
        const auth = String(s?.keys?.auth ?? "");
        if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) return ResponseService.badRequest(res, "Invalid push subscription");

        // Ek device = ek endpoint. Staff badal jaye to naye staff ke naam par chadh jata hai
        const existing = await pushSubscriptionModel.findOne({ where: { endpoint } });
        const data = { fk_hotel_id: req.user.fk_hotel_id, fk_staff_id: req.user.pk_staff_id, role: req.user.role, endpoint, p256dh, auth };
        if (existing) await existing.update(data);
        else await pushSubscriptionModel.create(data);
        return ResponseService.success(res, "Notifications are on for this device");
    } catch (e) {
        return ResponseService.error(res, e.message);
    }
};

const unsubscribe = async (req, res) => {
    try {
        const endpoint = String(req.body?.endpoint ?? "");
        if (endpoint) await pushSubscriptionModel.destroy({ where: { endpoint, fk_staff_id: req.user.pk_staff_id } });
        return ResponseService.success(res, "Notifications are off for this device");
    } catch (e) {
        return ResponseService.error(res, e.message);
    }
};

export { key, subscribe, unsubscribe };

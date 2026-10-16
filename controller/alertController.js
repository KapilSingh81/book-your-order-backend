import ResponseService from "../utils/httpService.js";
import { alertModel } from "../model/index.js";
import { hotelIdOf, toId } from "../utils/hotelScope.js";

const resolve = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid alert id is required");
        const alert = await alertModel.findOne({ where: { pk_alert_id: id, fk_hotel_id: hotelIdOf(req) } });
        if (!alert) return ResponseService.notFound(res, "Alert not found");
        if (!alert.is_done) await alert.update({ is_done: true, done_at: new Date() });
        return ResponseService.success(res, "Alert resolved");
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { resolve };

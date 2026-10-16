import ResponseService from "../utils/httpService.js";
import { orderModel, tableModel, orderItemModel, guestModel, billModel } from "../model/index.js";
import { ORDER_STATUS } from "../model/orderModel.js";
import { hotelIdOf, toId } from "../utils/hotelScope.js";
import { snapshot, orderDto } from "../utils/serialize.js";

/**
 * Counter / kitchen ka live data: abhi khule sabhi tables ke orders, bills (aaj ke), alerts.
 * Frontend isko har kuch second me poll karta hai.
 */
const live = async (req, res) => {
    try {
        // Staff ne screen kholi = hotel ne order "dekh" liya. Customer ko "Hotel has your order" dikhta hai
        await orderModel.update({ seen_at: new Date() }, { where: { fk_hotel_id: hotelIdOf(req), status: "placed", seen_at: null, is_void: false } });
        const data = await snapshot({ hotelId: hotelIdOf(req), includeTodayBills: true });
        return ResponseService.success(res, "Success", data);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

/** placed -> preparing -> served. Peeche nahi jata, status ek hi order ke liye dubara bheja to koi galti nahi */
const setStatus = async (req, res) => {
    try {
        const id = toId(req.params.id);
        const next = req.body?.status;
        if (!id) return ResponseService.badRequest(res, "Valid order id is required");
        if (!ORDER_STATUS.includes(next)) return ResponseService.badRequest(res, `status must be one of: ${ORDER_STATUS.join(", ")}`);

        const order = await orderModel.findOne({
            where: { pk_order_id: id, fk_hotel_id: hotelIdOf(req) },
            include: [{ model: orderItemModel, as: "items" }, { model: guestModel, as: "guest" }],
        });
        if (!order) return ResponseService.notFound(res, "Order not found");

        const from = ORDER_STATUS.indexOf(order.status);
        const to = ORDER_STATUS.indexOf(next);
        if (to < from) return ResponseService.badRequest(res, `This order is already ${order.status}`);
        if (to > from) await order.update({ status: next, status_at: new Date() });

        const table = await tableModel.findOne({ where: { pk_table_id: order.fk_table_id } });
        const bill = order.fk_bill_id ? await billModel.findOne({ where: { pk_bill_id: order.fk_bill_id } }) : null;
        return ResponseService.success(res, `Order is ${order.status}`, orderDto(order, table?.table_number ?? 0, bill?.bill_no));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

/**
 * Order hatao: galat / duplicate / hotel ke bahar se aaya. Sirf tab jab abhi "placed" ho (kitchen ne start na kiya ho)
 * aur bill na bana ho. Customer ko "Cancelled by the hotel" dikhta hai.
 */
const voidOrder = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid order id is required");
        const order = await orderModel.findOne({ where: { pk_order_id: id, fk_hotel_id: hotelIdOf(req) } });
        if (!order) return ResponseService.notFound(res, "Order not found");
        if (order.is_void) return ResponseService.success(res, "Order was already removed");
        if (order.status !== "placed") return ResponseService.badRequest(res, "The kitchen has already started this order");
        if (order.fk_bill_id) return ResponseService.badRequest(res, "This order is already billed");
        const reason = String(req.body?.reason ?? "").trim().slice(0, 120) || "Cancelled by the hotel";
        await order.update({ is_void: true, void_reason: reason });
        return ResponseService.success(res, "Order removed");
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { live, setStatus, voidOrder };

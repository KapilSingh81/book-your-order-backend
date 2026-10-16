import express from "express";
import { live, setStatus, voidOrder } from "../controller/orderController.js";
import Auth, { allow } from "../middleware/auth.js";

const orderRouter = express.Router();
orderRouter.use(Auth, allow("counter", "kitchen"));

/**
 * @swagger
 * tags:
 *   name: Order
 *   description: Counter and kitchen order handling. Status flow is only placed -> preparing -> served
 */

/**
 * @swagger
 * /api/order/live:
 *   get:
 *     summary: Live data for counter/kitchen - orders of all open tables, today's bills, pending alerts. Poll every few seconds
 *     tags: [Order]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "{ sessions, orders, receipts, alerts }"
 */
orderRouter.get("/live", live);

/**
 * @swagger
 * /api/order/status/{id}:
 *   patch:
 *     summary: Move an order forward - preparing or served
 *     tags: [Order]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer }, description: pk of the order }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [placed, preparing, served] }
 *     responses:
 *       200: { description: Status changed }
 *       400: { description: Cannot go back }
 */
orderRouter.patch("/status/:id", setStatus);

/**
 * @swagger
 * /api/order/void/{id}:
 *   post:
 *     summary: Remove a wrong / fake / out-of-hotel order. Only while it is still "placed". It is never billed
 *     tags: [Order]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: Customer left the hotel }
 *     responses:
 *       200: { description: Removed }
 *       400: { description: Kitchen already started it }
 */
orderRouter.post("/void/:id", voidOrder);

export default orderRouter;

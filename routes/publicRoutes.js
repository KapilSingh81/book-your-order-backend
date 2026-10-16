import express from "express";
import { menu, tableState, placeOrder, raiseAlert, customerPay } from "../controller/publicController.js";
import { rateLimit } from "../middleware/rateLimit.js";

const publicRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Customer portal APIs (no login). The table's QR secret (k) is checked on the server
 */

/**
 * @swagger
 * /api/public/{slug}/menu:
 *   get:
 *     summary: Hotel, categories, dishes with sizes, tables and payment methods. Unavailable dishes come with available=false
 *     tags: [Public]
 *     parameters:
 *       - { in: path, name: slug, required: true, schema: { type: string, example: hotel-sunrise } }
 *     responses:
 *       200: { description: Menu retrieved }
 *       404: { description: Hotel not found }
 */
publicRouter.get("/:slug/menu", menu);

/**
 * @swagger
 * /api/public/{slug}/table/{number}:
 *   get:
 *     summary: Orders, bills and alerts of one table (customer polls this)
 *     tags: [Public]
 *     parameters:
 *       - { in: path, name: slug, required: true, schema: { type: string } }
 *       - { in: path, name: number, required: true, schema: { type: integer } }
 *       - { in: query, name: k, schema: { type: string }, description: QR secret }
 *     responses:
 *       200: { description: Table state }
 *       403: { description: QR code not valid }
 */
publicRouter.get("/:slug/table/:number", tableState);

/**
 * @swagger
 * /api/public/{slug}/order:
 *   post:
 *     summary: Place an order. Fails with 409 if any dish is currently unavailable
 *     tags: [Public]
 *     parameters:
 *       - { in: path, name: slug, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [table, k, guest, items]
 *             properties:
 *               table: { type: integer, example: 2 }
 *               k: { type: string, description: QR secret }
 *               note: { type: string }
 *               request_id: { type: string, description: Random id made by the phone for this order. Sending the same id again (retry) never creates a second order }
 *               geo:
 *                 type: object
 *                 description: Phone location, used when the hotel turned on the location check
 *                 properties:
 *                   lat: { type: number }
 *                   lng: { type: number }
 *                   acc: { type: number, description: accuracy in metres }
 *               guest:
 *                 type: object
 *                 properties:
 *                   id: { type: string, example: 6f1c2a9e-3b1d-4c8e-9a77-0a1b2c3d4e5f }
 *                   name: { type: string, example: Rohan }
 *                   seat: { type: integer, example: 1 }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dish_id: { type: integer }
 *                     portion_id: { type: integer }
 *                     qty: { type: integer, example: 2 }
 *     responses:
 *       201: { description: Order placed }
 *       403: { description: Customer is away from the hotel (location check = block) or QR invalid }
 *       409: { description: Dish currently unavailable }
 */
publicRouter.post("/:slug/order", rateLimit({ max: 30 }), placeOrder);

/**
 * @swagger
 * /api/public/{slug}/alert:
 *   post:
 *     summary: Call a waiter or ask for the bill
 *     tags: [Public]
 *     parameters:
 *       - { in: path, name: slug, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [table, k, type]
 *             properties:
 *               table: { type: integer }
 *               k: { type: string }
 *               type: { type: string, enum: [waiter, bill] }
 *               guest_name: { type: string }
 *     responses:
 *       200: { description: Alert sent }
 */
publicRouter.post("/:slug/alert", rateLimit({ max: 20 }), raiseAlert);

/**
 * @swagger
 * /api/public/{slug}/pay:
 *   post:
 *     summary: Customer pays by phone. Works only when ALLOW_CUSTOMER_PAY=true, otherwise pay at the counter
 *     tags: [Public]
 *     parameters:
 *       - { in: path, name: slug, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [table, k, method]
 *             properties:
 *               table: { type: integer }
 *               k: { type: string }
 *               method: { type: string, example: upi }
 *               scope: { type: string, enum: [mine, table] }
 *               guest_id: { type: string }
 *     responses:
 *       201: { description: Receipt }
 *       403: { description: Customer payment is off }
 */
publicRouter.post("/:slug/pay", rateLimit({ max: 10 }), customerPay);

export default publicRouter;

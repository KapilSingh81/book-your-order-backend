import express from "express";
import { key, subscribe, unsubscribe } from "../controller/pushController.js";
import Auth, { allow } from "../middleware/auth.js";

const pushRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Push
 *   description: Web push notifications for counter / kitchen (new order, waiter call, bill request, order waiting too long)
 */

/**
 * @swagger
 * /api/push/key:
 *   get:
 *     summary: VAPID public key for the browser. Empty publicKey means push is off on the server
 *     tags: [Push]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ publicKey }" }
 */
pushRouter.get("/key", Auth, key);

/**
 * @swagger
 * /api/push/subscribe:
 *   post:
 *     summary: Save this device for notifications
 *     tags: [Push]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscription: { type: object, description: PushSubscription.toJSON() }
 *     responses:
 *       200: { description: Saved }
 */
pushRouter.post("/subscribe", Auth, allow("counter", "kitchen"), subscribe);

/**
 * @swagger
 * /api/push/unsubscribe:
 *   post:
 *     summary: Stop notifications for this device
 *     tags: [Push]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endpoint: { type: string }
 *     responses:
 *       200: { description: Removed }
 */
pushRouter.post("/unsubscribe", Auth, allow("counter", "kitchen"), unsubscribe);

export default pushRouter;

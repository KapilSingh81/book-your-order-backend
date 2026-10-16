import express from "express";
import { resolve } from "../controller/alertController.js";
import Auth, { allow } from "../middleware/auth.js";

const alertRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Alert
 *   description: Waiter / bill requests from customers
 */

/**
 * @swagger
 * /api/alert/resolve/{id}:
 *   patch:
 *     summary: Mark an alert as done
 *     tags: [Alert]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Resolved }
 */
alertRouter.patch("/resolve/:id", Auth, allow("counter", "kitchen"), resolve);

export default alertRouter;

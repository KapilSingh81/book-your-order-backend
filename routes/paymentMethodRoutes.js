import express from "express";
import { list, create, update, remove } from "../controller/paymentMethodController.js";
import Auth, { allow } from "../middleware/auth.js";

const paymentMethodRouter = express.Router();
paymentMethodRouter.use(Auth);

/**
 * @swagger
 * tags:
 *   name: PaymentMethod
 *   description: UPI / Card / Cash etc.
 */

/**
 * @swagger
 * /api/payment-method/list:
 *   get:
 *     summary: Payment methods of my hotel
 *     tags: [PaymentMethod]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Payment methods retrieved }
 */
paymentMethodRouter.get("/list", list);

/**
 * @swagger
 * /api/payment-method/create:
 *   post:
 *     summary: Add a payment method (owner)
 *     tags: [PaymentMethod]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method_name]
 *             properties:
 *               method_name: { type: string, example: Wallet }
 *               hint: { type: string }
 *               icon: { type: string, example: fa-wallet }
 *     responses:
 *       201: { description: Created }
 */
paymentMethodRouter.post("/create", allow("owner"), create);

/**
 * @swagger
 * /api/payment-method/update/{id}:
 *   put:
 *     summary: Update a payment method (owner)
 *     tags: [PaymentMethod]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method_name: { type: string }
 *               hint: { type: string }
 *               icon: { type: string }
 *               sort_order: { type: integer }
 *               status: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 */
paymentMethodRouter.put("/update/:id", allow("owner"), update);

/**
 * @swagger
 * /api/payment-method/delete/{id}:
 *   delete:
 *     summary: Delete a payment method (owner)
 *     tags: [PaymentMethod]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
paymentMethodRouter.delete("/delete/:id", allow("owner"), remove);

export default paymentMethodRouter;

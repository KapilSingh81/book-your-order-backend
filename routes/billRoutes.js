import express from "express";
import { pay, history } from "../controller/billController.js";
import Auth, { allow } from "../middleware/auth.js";

const billRouter = express.Router();
billRouter.use(Auth, allow("counter"));

/**
 * @swagger
 * tags:
 *   name: Bill
 *   description: Payments and receipts. A guest can get a separate bill, or one bill for the whole table
 */

/**
 * @swagger
 * /api/bill/pay:
 *   post:
 *     summary: Record a payment and issue a bill number
 *     tags: [Bill]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [table_number, method]
 *             properties:
 *               table_number: { type: integer, example: 2 }
 *               guest_id: { type: string, description: Guest's id. Leave out for the whole table }
 *               method: { type: string, example: upi }
 *     responses:
 *       201: { description: Receipt }
 *       400: { description: Nothing to pay }
 */
billRouter.post("/pay", pay);

/**
 * @swagger
 * /api/bill/history:
 *   get:
 *     summary: Bills between two dates (default today) with total sales
 *     tags: [Bill]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: from, schema: { type: string, example: "2026-10-01" } }
 *       - { in: query, name: to, schema: { type: string, example: "2026-10-14" } }
 *     responses:
 *       200: { description: Bills retrieved }
 */
billRouter.get("/history", history);

export default billRouter;

import express from "express";
import { list, createRange, update, regenerateToken, remove, closeTable } from "../controller/tableController.js";
import Auth, { allow } from "../middleware/auth.js";

const tableRouter = express.Router();
tableRouter.use(Auth);

/**
 * @swagger
 * tags:
 *   name: Table
 *   description: Tables and their QR secret
 */

/**
 * @swagger
 * /api/table/list:
 *   get:
 *     summary: Tables of my hotel (with qr_token for printing QR)
 *     tags: [Table]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tables retrieved }
 */
tableRouter.get("/list", list);

/**
 * @swagger
 * /api/table/create:
 *   post:
 *     summary: Add tables by number range (owner)
 *     tags: [Table]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [from]
 *             properties:
 *               from: { type: integer, example: 1 }
 *               to: { type: integer, example: 12 }
 *               seats: { type: integer, example: 4 }
 *     responses:
 *       201: { description: Tables added }
 *       409: { description: Tables already exist }
 */
tableRouter.post("/create", allow("owner"), createRange);

/**
 * @swagger
 * /api/table/update/{id}:
 *   put:
 *     summary: Rename a table or change its seats (owner)
 *     tags: [Table]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               table_label: { type: string, example: Garden 2 }
 *               seats: { type: integer }
 *               status: { type: boolean }
 *     responses:
 *       200: { description: Table updated }
 */
tableRouter.put("/update/:id", allow("owner"), update);

/**
 * @swagger
 * /api/table/regenerate-token/{id}:
 *   post:
 *     summary: New QR secret. The old printed QR stops working (owner)
 *     tags: [Table]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: New token generated }
 */
tableRouter.post("/regenerate-token/:id", allow("owner"), regenerateToken);

/**
 * @swagger
 * /api/table/close/{id}:
 *   post:
 *     summary: Free the table for the next guests (counter). Fails while orders are unpaid unless force is true
 *     tags: [Table]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force: { type: boolean }
 *     responses:
 *       200: { description: Table closed }
 *       400: { description: Unpaid orders }
 */
tableRouter.post("/close/:id", allow("counter"), closeTable);

/**
 * @swagger
 * /api/table/delete/{id}:
 *   delete:
 *     summary: Delete a table (owner)
 *     tags: [Table]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Table deleted }
 */
tableRouter.delete("/delete/:id", allow("owner"), remove);

export default tableRouter;

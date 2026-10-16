import express from "express";
import { create, list, getById, update, remove } from "../controller/categoryController.js";
import Auth, { allow } from "../middleware/auth.js";

const categoryRouter = express.Router();
categoryRouter.use(Auth, allow("owner"));

/**
 * @swagger
 * tags:
 *   name: Category
 *   description: Menu categories (Starters, Main course ...)
 */

/**
 * @swagger
 * /api/category/create:
 *   post:
 *     summary: Create a category
 *     tags: [Category]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category_name]
 *             properties:
 *               category_name: { type: string, example: Starters }
 *               blurb: { type: string, example: Tandoor and fry }
 *               sort_order: { type: integer }
 *               status: { type: boolean, example: true }
 *     responses:
 *       201: { description: Category created }
 *       409: { description: Category already exists }
 */
categoryRouter.post("/create", create);

/**
 * @swagger
 * /api/category/list:
 *   get:
 *     summary: List categories of my hotel
 *     tags: [Category]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: boolean } }
 *     responses:
 *       200: { description: Categories retrieved }
 */
categoryRouter.get("/list", list);

/**
 * @swagger
 * /api/category/update/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Category]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category_name]
 *             properties:
 *               category_name: { type: string }
 *               blurb: { type: string }
 *               sort_order: { type: integer }
 *               status: { type: boolean }
 *     responses:
 *       200: { description: Category updated }
 */
categoryRouter.put("/update/:id", update);

/**
 * @swagger
 * /api/category/delete/{id}:
 *   delete:
 *     summary: Delete a category (only if it has no dishes)
 *     tags: [Category]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Category deleted }
 *       400: { description: Category still has dishes }
 */
categoryRouter.delete("/delete/:id", remove);

/**
 * @swagger
 * /api/category/{id}:
 *   get:
 *     summary: Get a category
 *     tags: [Category]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Category retrieved }
 */
categoryRouter.get("/:id", getById);

export default categoryRouter;

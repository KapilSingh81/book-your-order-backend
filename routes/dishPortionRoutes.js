import express from "express";
import { create, listByDish, getById, update, remove } from "../controller/dishPortionController.js";
import Auth, { allow } from "../middleware/auth.js";

const dishPortionRouter = express.Router();
dishPortionRouter.use(Auth, allow("owner"));

/**
 * @swagger
 * tags:
 *   name: DishPortion
 *   description: Single size/price rows of a dish (dish API already manages them together)
 */

/**
 * @swagger
 * /api/dish-portion/create:
 *   post:
 *     summary: Add a size to a dish
 *     tags: [DishPortion]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fk_dish_id, portion_label, price]
 *             properties:
 *               fk_dish_id: { type: integer }
 *               portion_label: { type: string, example: Half }
 *               price: { type: number, example: 150 }
 *               sort_order: { type: integer }
 *               status: { type: boolean }
 *     responses:
 *       201: { description: Size created }
 */
dishPortionRouter.post("/create", create);

/**
 * @swagger
 * /api/dish-portion/list/{dishId}:
 *   get:
 *     summary: Sizes of a dish
 *     tags: [DishPortion]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: dishId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Sizes retrieved }
 */
dishPortionRouter.get("/list/:dishId", listByDish);

/**
 * @swagger
 * /api/dish-portion/update/{id}:
 *   put:
 *     summary: Update a size
 *     tags: [DishPortion]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [portion_label]
 *             properties:
 *               portion_label: { type: string }
 *               price: { type: number }
 *               sort_order: { type: integer }
 *               status: { type: boolean }
 *     responses:
 *       200: { description: Size updated }
 */
dishPortionRouter.put("/update/:id", update);

/**
 * @swagger
 * /api/dish-portion/delete/{id}:
 *   delete:
 *     summary: Delete a size (a dish keeps at least one)
 *     tags: [DishPortion]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Size deleted }
 */
dishPortionRouter.delete("/delete/:id", remove);

/**
 * @swagger
 * /api/dish-portion/{id}:
 *   get:
 *     summary: Get a size
 *     tags: [DishPortion]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Size retrieved }
 */
dishPortionRouter.get("/:id", getById);

export default dishPortionRouter;

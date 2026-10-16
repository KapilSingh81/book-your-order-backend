import express from "express";
import { create, list, getById, update, setAvailability, remove } from "../controller/dishController.js";
import { upload } from "../middleware/upload.js";
import Auth, { allow } from "../middleware/auth.js";

const dishRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dish
 *   description: Dishes with sizes and prices (Half 150 / Full 300)
 */

/**
 * @swagger
 * /api/dish/create:
 *   post:
 *     summary: Create a dish with its sizes
 *     tags: [Dish]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [fk_category_id, dish_name, portions]
 *             properties:
 *               fk_category_id: { type: integer }
 *               dish_name: { type: string, example: Paneer Tikka }
 *               description: { type: string }
 *               is_veg: { type: boolean }
 *               spicy_level: { type: integer, minimum: 0, maximum: 3 }
 *               prep_minutes: { type: integer }
 *               is_bestseller: { type: boolean }
 *               is_available: { type: boolean, description: false = Currently unavailable for customers }
 *               illustration: { type: string, description: Built-in picture name, used when no image is uploaded }
 *               portions:
 *                 type: string
 *                 description: JSON array
 *                 example: '[{"portion_label":"Half","price":150},{"portion_label":"Full","price":300}]'
 *               image: { type: string, format: binary }
 *     responses:
 *       201: { description: Dish created }
 *       409: { description: Dish already exists }
 */
dishRouter.post("/create", Auth, allow("owner"), upload.single("image"), create);

/**
 * @swagger
 * /api/dish/list:
 *   get:
 *     summary: List dishes of my hotel (with sizes)
 *     tags: [Dish]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: fk_category_id, schema: { type: integer } }
 *       - { in: query, name: is_veg, schema: { type: boolean } }
 *       - { in: query, name: is_available, schema: { type: boolean } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: Dishes retrieved }
 */
dishRouter.get("/list", Auth, allow("owner"), list);

/**
 * @swagger
 * /api/dish/update/{id}:
 *   put:
 *     summary: Update a dish (send portions to replace its sizes)
 *     tags: [Dish]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [dish_name]
 *             properties:
 *               fk_category_id: { type: integer }
 *               dish_name: { type: string }
 *               description: { type: string }
 *               is_veg: { type: boolean }
 *               spicy_level: { type: integer }
 *               prep_minutes: { type: integer }
 *               is_bestseller: { type: boolean }
 *               is_available: { type: boolean }
 *               illustration: { type: string }
 *               portions: { type: string }
 *               image: { type: string, format: binary }
 *     responses:
 *       200: { description: Dish updated }
 */
dishRouter.put("/update/:id", Auth, allow("owner"), upload.single("image"), update);

/**
 * @swagger
 * /api/dish/availability/{id}:
 *   patch:
 *     summary: Mark a dish available or sold out (counter, kitchen and owner)
 *     tags: [Dish]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_available]
 *             properties:
 *               is_available: { type: boolean }
 *     responses:
 *       200: { description: Availability changed }
 */
dishRouter.patch("/availability/:id", Auth, allow("counter", "kitchen"), setAvailability);

/**
 * @swagger
 * /api/dish/delete/{id}:
 *   delete:
 *     summary: Delete a dish
 *     tags: [Dish]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Dish deleted }
 */
dishRouter.delete("/delete/:id", Auth, allow("owner"), remove);

/**
 * @swagger
 * /api/dish/{id}:
 *   get:
 *     summary: Get a dish with sizes
 *     tags: [Dish]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Dish retrieved }
 */
dishRouter.get("/:id", Auth, allow("owner"), getById);

export default dishRouter;

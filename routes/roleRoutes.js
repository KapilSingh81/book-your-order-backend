import express from "express";
import { List } from "../controller/roleController.js";
import Auth, { allow } from "../middleware/auth.js";

const roleRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Role
 *   description: Roles (owner, counter, kitchen) - seed se bante hain
 */

/**
 * @swagger
 * /api/role/list:
 *   get:
 *     summary: Get all roles (staff banate waqt dropdown ke liye)
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved
 */
roleRouter.get("/list", Auth, allow("owner"), List);

export default roleRouter;

import express from "express";
import { create, list, getById, update, remove } from "../controller/staffController.js";
import Auth, { allow } from "../middleware/auth.js";

const staffRouter = express.Router();
// Staff sirf owner manage karta hai
staffRouter.use(Auth, allow("owner"));

/**
 * @swagger
 * tags:
 *   name: Staff
 *   description: Hotel staff (Owner, Counter, Kitchen) master APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Staff:
 *       type: object
 *       description: password_hash kabhi response me nahi aata
 *       properties:
 *         pk_staff_id:
 *           type: integer
 *           example: 1
 *         fk_hotel_id:
 *           type: integer
 *           example: 1
 *         fk_role_id:
 *           type: integer
 *           example: 2
 *         staff_name:
 *           type: string
 *           example: Rohan Sharma
 *         email:
 *           type: string
 *           format: email
 *           example: rohan@hotelsunrise.in
 *         status:
 *           type: boolean
 *           example: true
 *         is_deleted:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     StaffResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Staff retrieved successfully
 *         data:
 *           $ref: '#/components/schemas/Staff'
 *
 *     StaffListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Staff retrieved successfully
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Staff'
 *
 *     StaffCreateRequest:
 *       type: object
 *       required: [fk_hotel_id, fk_role_id, staff_name, email, password]
 *       properties:
 *         fk_hotel_id:
 *           type: integer
 *           description: Login (JWT) lagne ke baad token se aayega, tab ye field nahi bhejni
 *           example: 1
 *         fk_role_id:
 *           type: integer
 *           description: role_master ki id (Owner, Counter, Kitchen)
 *           example: 2
 *         staff_name:
 *           type: string
 *           example: Rohan Sharma
 *         email:
 *           type: string
 *           format: email
 *           description: Poori system me unique, login isi se hoga
 *           example: rohan@hotelsunrise.in
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: Rohan@12345
 *         status:
 *           type: boolean
 *           example: true
 *
 *     StaffUpdateRequest:
 *       type: object
 *       required: [staff_name]
 *       properties:
 *         staff_name:
 *           type: string
 *           example: Rohan Sharma
 *         email:
 *           type: string
 *           format: email
 *           description: Nahi bheja to purani email
 *         fk_role_id:
 *           type: integer
 *           description: Nahi bheja to purana role
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           description: Sirf password badalna ho tab bhejo
 *         status:
 *           type: boolean
 */

/**
 * @swagger
 * /api/staff/create:
 *   post:
 *     summary: Create a staff member
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StaffCreateRequest'
 *     responses:
 *       201:
 *         description: Staff created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
staffRouter.post("/create", create);

/**
 * @swagger
 * /api/staff/list:
 *   get:
 *     summary: Get all staff of a hotel
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fk_hotel_id
 *         schema:
 *           type: integer
 *         description: Login (JWT) lagne ke baad token se aayega, tab ye nahi bhejna
 *         example: 1
 *       - in: query
 *         name: fk_role_id
 *         schema:
 *           type: integer
 *         description: Sirf is role ka staff
 *       - in: query
 *         name: status
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Staff retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffListResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
staffRouter.get("/list", list);

/**
 * @swagger
 * /api/staff/update/{id}:
 *   put:
 *     summary: Update a staff member
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StaffUpdateRequest'
 *     responses:
 *       200:
 *         description: Staff updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
staffRouter.put("/update/:id", update);

/**
 * @swagger
 * /api/staff/delete/{id}:
 *   delete:
 *     summary: Delete a staff member (soft delete, login band ho jata hai)
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Staff deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Khud ka account delete nahi kar sakte
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
staffRouter.delete("/delete/:id", remove);

/**
 * @swagger
 * /api/staff/{id}:
 *   get:
 *     summary: Get staff by ID
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Staff retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
staffRouter.get("/:id", getById);

export default staffRouter;
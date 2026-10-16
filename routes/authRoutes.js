import express from "express";
import { Login, Me, ChangePassword, RegisterHotel } from "../controller/authController.js";
import Auth from "../middleware/auth.js";

const authRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Login, signup and password
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Staff login (owner / counter / kitchen)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: owner@hotelsunrise.in }
 *               password: { type: string, example: Owner@123 }
 *     responses:
 *       200:
 *         description: Returns { user, token }
 *       400:
 *         description: Invalid credentials
 */
authRouter.post("/login", Login);

/**
 * @swagger
 * /api/auth/register-hotel:
 *   post:
 *     summary: Register a new hotel with its owner login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hotel_name, phone_number, hotel_address, owner_name, email, password]
 *             properties:
 *               hotel_name: { type: string, example: Hotel Sunrise }
 *               phone_number: { type: string, example: "9876543210" }
 *               hotel_address: { type: string, example: MG Road, Pune }
 *               owner_name: { type: string, example: Ramesh }
 *               email: { type: string, example: owner@hotelsunrise.in }
 *               password: { type: string, example: Owner@123 }
 *     responses:
 *       201:
 *         description: Hotel and owner created, returns { user, token }
 *       409:
 *         description: Email already exists
 */
authRouter.post("/register-hotel", RegisterHotel);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Current logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User with role and hotel
 *       401:
 *         description: Not logged in
 */
authRouter.get("/me", Auth, Me);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change own password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password: { type: string }
 *               new_password: { type: string, description: Minimum 8 characters }
 *     responses:
 *       200:
 *         description: Password changed
 */
authRouter.post("/change-password", Auth, ChangePassword);

export default authRouter;

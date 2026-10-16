import express from "express";
import { getMine, updateMine, getBySlug } from "../controller/hotelController.js";
import { upload } from "../middleware/upload.js";
import Auth, { allow } from "../middleware/auth.js";

const hotelRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Hotel
 *   description: Hotel profile
 */

/**
 * @swagger
 * /api/hotel/slug/{slug}:
 *   get:
 *     summary: Public hotel info by slug
 *     tags: [Hotel]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string, example: hotel-sunrise }
 *     responses:
 *       200:
 *         description: Hotel retrieved
 *       404:
 *         description: Hotel not found
 */
hotelRouter.get("/slug/:slug", getBySlug);

/**
 * @swagger
 * /api/hotel/me:
 *   get:
 *     summary: Logged-in staff's own hotel
 *     tags: [Hotel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hotel retrieved
 *   put:
 *     summary: Update own hotel (owner only). Slug never changes
 *     tags: [Hotel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               hotel_name: { type: string }
 *               tagline: { type: string }
 *               phone_number: { type: string }
 *               hotel_address: { type: string }
 *               GSTIN: { type: string }
 *               website: { type: string, description: Public address used inside QR codes }
 *               tax_rate: { type: number, example: 0.05, description: Total GST (0.05 = 5%), split into CGST + SGST }
 *               logo: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Hotel updated
 */
hotelRouter.get("/me", Auth, getMine);
hotelRouter.put("/me", Auth, allow("owner"), upload.single("logo"), updateMine);

export default hotelRouter;

// Demo hotel banata hai: npm run seed
// Login: owner@hotelsunrise.in / Owner@123, counter@hotelsunrise.in / Counter@123, kitchen@hotelsunrise.in / Kitchen@123
import "dotenv/config";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { dbConnect } from "../config/db.config.js";
import {
    hotelModel, roleModel, staffModel, categoryModel, dishModel, dishPortionModel, tableModel, paymentMethodModel,
} from "../model/index.js";
import { DEFAULT_PAYMENT_METHODS } from "../model/paymentMethodModel.js";
import { ensureRoles } from "../services/bootstrap.js";
import { DEMO_CATEGORIES, DEMO_DISHES } from "./demoMenu.js";

const SLUG = "hotel-sunrise";
const token = () => crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8).toLowerCase();

await dbConnect.sync({ alter: process.env.DB_SYNC_ALTER !== "false" });
await ensureRoles();

let hotel = await hotelModel.findOne({ where: { hotel_slug: SLUG } });
if (hotel) {
    console.log(`Demo hotel already exists (id ${hotel.pk_hotel_id}). Nothing to do.`);
    await dbConnect.close();
    process.exit(0);
}

await dbConnect.transaction(async (t) => {
    hotel = await hotelModel.create({
        hotel_name: "Hotel Sunrise", hotel_slug: SLUG, tagline: "Family restaurant, Jaipur",
        phone_number: "+91 141 400 0000", hotel_address: "12 Station Road, Jaipur 302001",
        GSTIN: "08AAAAA0000A1Z5", tax_rate: 0.05,
    }, { transaction: t });
    const hotelId = hotel.pk_hotel_id;

    await paymentMethodModel.bulkCreate(
        DEFAULT_PAYMENT_METHODS.map((m, i) => ({ ...m, fk_hotel_id: hotelId, sort_order: i })), { transaction: t });

    const roles = Object.fromEntries((await roleModel.findAll({ transaction: t })).map((r) => [r.name, r.id]));
    const users = [
        ["Owner", "owner@hotelsunrise.in", "Owner@123", "owner"],
        ["Counter", "counter@hotelsunrise.in", "Counter@123", "counter"],
        ["Kitchen", "kitchen@hotelsunrise.in", "Kitchen@123", "kitchen"],
    ];
    for (const [name, email, pass, role] of users) {
        await staffModel.create({
            fk_hotel_id: hotelId, fk_role_id: roles[role], staff_name: name, email,
            password_hash: await bcrypt.hash(pass, 10),
        }, { transaction: t });
    }

    const catId = {};
    for (const [i, c] of DEMO_CATEGORIES.entries()) {
        const row = await categoryModel.create({ fk_hotel_id: hotelId, category_name: c.name, blurb: c.blurb, sort_order: i }, { transaction: t });
        catId[c.id] = row.pk_category_id;
    }
    for (const d of DEMO_DISHES) {
        const dish = await dishModel.create({
            fk_hotel_id: hotelId, fk_category_id: catId[d.category], dish_name: d.name, description: d.desc,
            is_veg: d.veg, spicy_level: d.spicy, prep_minutes: d.minutes, is_bestseller: !!d.bestseller,
            is_available: d.available, illustration: d.id, rating: d.rating, votes: d.votes,
        }, { transaction: t });
        await dishPortionModel.bulkCreate(
            d.portions.map((p, i) => ({ fk_dish_id: dish.pk_dish_id, portion_label: p.label, price: p.price, sort_order: i })),
            { transaction: t });
    }

    const seats = [2, 4, 6, 4, 6, 4, 4, 2, 6, 4, 4, 6];
    await tableModel.bulkCreate(seats.map((s, i) => ({ fk_hotel_id: hotelId, table_number: i + 1, seats: s, qr_token: token() })), { transaction: t });
});

console.log("Demo hotel created: /h/hotel-sunrise");
console.log("Owner: owner@hotelsunrise.in / Owner@123");
console.log("Counter: counter@hotelsunrise.in / Counter@123");
console.log("Kitchen: kitchen@hotelsunrise.in / Kitchen@123");
await dbConnect.close();

/**
 * Demo hotel: npm run seed
 * Hotel Sunrise + menu + 12 tables + 3 logins (owner / counter / kitchen). Dobara chalane par kuch dubara nahi banta.
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { dbConnect } from "../config/db.config.js";
import {
    hotelModel, roleModel, staffModel, categoryModel, dishModel, dishPortionModel, tableModel, paymentMethodModel,
} from "../model/index.js";
import { DEFAULT_PAYMENT_METHODS } from "../model/paymentMethodModel.js";
import { seedRoles } from "./roles.js";

const CATS = [
    ["starters", "Starters", "Tandoor and fry"],
    ["main", "Main course", "Curries and dal"],
    ["rice", "Biryani and rice", "Dum and steamed"],
    ["breads", "Breads", "Fresh from the tandoor"],
    ["fast", "Pizza and noodles", "Quick favourites"],
    ["desserts", "Desserts", "Something sweet"],
    ["drinks", "Drinks", "Cool and hot"],
];

const H = (a, b) => [["Half", a], ["Full", b]];
const O = (p, l = "Regular") => [[l, p]];
const B = (a, b) => [["1 pc", a], ["6 pcs", b]];

// [illustration, name, category, portions, veg, rating, votes, minutes, spicy, description, extra]
const DISHES = [
    ["paneer-tikka", "Paneer Tikka", "starters", H(150, 300), 1, 4.6, 1240, 15, 2, "Smoky tandoori cottage cheese with capsicum and onion, served with mint chutney.", { best: 1 }],
    ["chicken-65", "Chicken 65", "starters", H(160, 289), 0, 4.5, 980, 18, 3, "Crisp fried chicken tossed with curry leaves, green chilli and pepper."],
    ["spring-rolls", "Veg Spring Rolls", "starters", O(199), 1, 4.2, 610, 12, 1, "Golden rolls stuffed with cabbage, carrot and glass noodles, with sweet chilli dip."],
    ["hara-bhara-kabab", "Hara Bhara Kabab", "starters", O(229), 1, 4.4, 702, 14, 1, "Spinach, peas and potato patties, pan-seared and served with chutney."],
    ["crispy-corn", "Crispy Corn", "starters", O(189), 1, 4.3, 540, 10, 1, "Fried sweet corn tossed with onion, capsicum and chaat masala."],
    ["paneer-butter-masala", "Paneer Butter Masala", "main", H(160, 299), 1, 4.7, 2310, 20, 1, "Soft paneer in a rich tomato and cashew gravy finished with butter.", { best: 1 }],
    ["dal-makhani", "Dal Makhani", "main", H(140, 249), 1, 4.6, 1480, 18, 0, "Black lentils simmered overnight and finished with cream and butter."],
    ["butter-chicken", "Butter Chicken", "main", H(210, 349), 0, 4.8, 3120, 22, 1, "Tandoori chicken in a silky tomato gravy. The house favourite.", { best: 1 }],
    ["palak-paneer", "Palak Paneer", "main", H(150, 279), 1, 4.3, 640, 18, 0, "Paneer cubes in a smooth spinach gravy with garlic and cumin."],
    ["kadai-paneer", "Kadai Paneer", "main", H(155, 289), 1, 4.4, 780, 20, 2, "Paneer with capsicum and onion in a freshly ground kadai masala."],
    ["chicken-biryani", "Chicken Biryani", "rice", H(189, 329), 0, 4.7, 2760, 28, 2, "Dum-cooked basmati layered with marinated chicken and saffron. Served with raita.", { best: 1 }],
    ["veg-biryani", "Veg Biryani", "rice", H(149, 259), 1, 4.2, 830, 25, 1, "Basmati rice with seasonal vegetables, mint and fried onions. Served with raita."],
    ["jeera-rice", "Jeera Rice", "rice", O(149), 1, 4.1, 430, 10, 0, "Steamed basmati tempered with cumin and ghee."],
    ["butter-naan", "Butter Naan", "breads", B(55, 300), 1, 4.5, 1900, 8, 0, "Soft leavened bread from the tandoor, brushed with butter."],
    ["garlic-naan", "Garlic Naan", "breads", B(69, 375), 1, 4.6, 2050, 8, 0, "Naan topped with chopped garlic and coriander.", { best: 1 }],
    ["tandoori-roti", "Tandoori Roti", "breads", B(29, 160), 1, 4.2, 760, 7, 0, "Whole wheat flatbread baked in the tandoor."],
    ["laccha-paratha", "Laccha Paratha", "breads", O(59, "1 pc"), 1, 4.4, 690, 9, 0, "Flaky layered whole wheat paratha with ghee.", { off: 1 }],
    ["margherita-pizza", "Margherita Pizza", "fast", O(299), 1, 4.4, 920, 18, 0, "Wood-fired base with tomato sauce, mozzarella and fresh basil."],
    ["farmhouse-pizza", "Farmhouse Pizza", "fast", O(379), 1, 4.4, 810, 20, 0, "Capsicum, onion, olives, sweet corn and mushroom on mozzarella."],
    ["hakka-noodles", "Veg Hakka Noodles", "fast", H(139, 219), 1, 4.1, 560, 14, 1, "Wok-tossed noodles with crunchy vegetables and soy."],
    ["red-sauce-pasta", "Red Sauce Pasta", "fast", O(249), 1, 4.2, 480, 15, 0, "Penne in a tangy tomato and basil sauce, topped with parmesan."],
    ["gulab-jamun", "Gulab Jamun", "desserts", [["2 pcs", 99], ["4 pcs", 189]], 1, 4.7, 2200, 6, 0, "Warm milk dumplings soaked in cardamom syrup.", { best: 1 }],
    ["rasmalai", "Rasmalai", "desserts", O(129, "2 pcs"), 1, 4.6, 1020, 5, 0, "Soft cheese discs in chilled saffron milk with pistachio."],
    ["brownie-sundae", "Brownie Sundae", "desserts", O(179), 1, 4.5, 890, 8, 0, "Warm chocolate brownie, vanilla ice cream and hot fudge."],
    ["gajar-halwa", "Gajar Halwa", "desserts", O(119), 1, 4.4, 640, 6, 0, "Slow-cooked carrot pudding with khoya, nuts and cardamom."],
    ["mango-lassi", "Mango Lassi", "drinks", O(99), 1, 4.6, 1330, 4, 0, "Thick chilled yoghurt blended with Alphonso mango pulp."],
    ["lime-soda", "Fresh Lime Soda", "drinks", O(79), 1, 4.3, 770, 3, 0, "Fresh lime and mint with soda. Choose sweet or salted at the counter."],
    ["cold-coffee", "Cold Coffee", "drinks", O(129), 1, 4.4, 910, 5, 0, "Blended coffee, milk and ice cream with a chocolate drizzle."],
    ["masala-chai", "Masala Chai", "drinks", [["Cup", 49], ["Kettle (3 cups)", 129]], 1, 4.5, 1560, 5, 0, "Strong tea simmered with ginger, cardamom and milk."],
];

const SEATS = [2, 4, 6, 4, 6, 4, 4, 2, 6, 4, 4, 6];
const LOGINS = [
    ["owner", "Ramesh (Owner)", "owner@hotelsunrise.in", "Owner@123"],
    ["counter", "Counter", "counter@hotelsunrise.in", "Counter@123"],
    ["kitchen", "Kitchen", "kitchen@hotelsunrise.in", "Kitchen@123"],
];

await dbConnect.sync({ alter: true });
await seedRoles();

let hotel = await hotelModel.findOne({ where: { hotel_slug: "hotel-sunrise" } });
if (hotel) {
    console.log("Hotel Sunrise already exists, nothing to do.");
    await dbConnect.close();
    process.exit(0);
}

hotel = await hotelModel.create({
    hotel_name: "Hotel Sunrise", hotel_slug: "hotel-sunrise", tagline: "Family restaurant, Jaipur",
    phone_number: "+91 141 400 0000", hotel_address: "12 Station Road, Jaipur 302001",
    GSTIN: "08AAAAA0000A1Z5", tax_rate: 0.05, website: process.env.PUBLIC_SITE_URL || null,
});
const hid = hotel.pk_hotel_id;

await paymentMethodModel.bulkCreate(DEFAULT_PAYMENT_METHODS.map((m, i) => ({ ...m, fk_hotel_id: hid, sort_order: i })));

const catId = {};
for (const [i, [key, name, blurb]] of CATS.entries()) {
    const c = await categoryModel.create({ fk_hotel_id: hid, category_name: name, blurb, sort_order: i });
    catId[key] = c.pk_category_id;
}

for (const [illu, name, cat, portions, veg, rating, votes, minutes, spicy, desc, extra = {}] of DISHES) {
    const d = await dishModel.create({
        fk_hotel_id: hid, fk_category_id: catId[cat], dish_name: name, description: desc, is_veg: !!veg,
        spicy_level: spicy, prep_minutes: minutes, is_bestseller: !!extra.best, is_available: !extra.off,
        illustration: illu, rating, votes,
    });
    await dishPortionModel.bulkCreate(portions.map(([label, price], i) => ({ fk_dish_id: d.pk_dish_id, portion_label: label, price, sort_order: i })));
}

await tableModel.bulkCreate(SEATS.map((seats, i) => ({
    fk_hotel_id: hid, table_number: i + 1, seats, qr_token: crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8).toLowerCase(),
})));

for (const [role, name, email, password] of LOGINS) {
    const r = await roleModel.findOne({ where: { name: role } });
    await staffModel.create({ fk_hotel_id: hid, fk_role_id: r.id, staff_name: name, email, password_hash: await bcrypt.hash(password, 10) });
}

console.log("Demo hotel ready: /h/hotel-sunrise");
for (const [role, , email, password] of LOGINS) console.log(`  ${role.padEnd(8)} ${email}  ${password}`);
await dbConnect.close();

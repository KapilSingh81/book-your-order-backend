import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import { Op, fn, col, where as sqlWhere } from "sequelize";
import { dbConnect } from "../config/db.config.js";
import ResponseService from "../utils/httpService.js";
import { staffModel, roleModel, hotelModel, paymentMethodModel } from "../model/index.js";
import { DEFAULT_PAYMENT_METHODS } from "../model/paymentMethodModel.js";
import { isBlank, slugify } from "../utils/hotelScope.js";

const SALT_ROUNDS = 10;
const MIN_PASSWORD = 8;
const sameEmail = (email) => sqlWhere(fn("lower", col("email")), email.trim().toLowerCase());

const signToken = (staff) =>
    jwt.sign({ id: staff.pk_staff_id, hotel: staff.fk_hotel_id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

/** Frontend ko jo chahiye: staff, role aur hotel ki chhoti info */
const userDto = (staff, role, hotel) => ({
    pk_staff_id: staff.pk_staff_id,
    staff_name: staff.staff_name,
    email: staff.email,
    role: String(role?.name ?? "").toLowerCase(),
    fk_hotel_id: staff.fk_hotel_id,
    hotel: hotel
        ? { pk_hotel_id: hotel.pk_hotel_id, hotel_name: hotel.hotel_name, hotel_slug: hotel.hotel_slug }
        : null,
});

const Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (isBlank(email) || isBlank(password)) return ResponseService.badRequest(res, "Email and password are required");
        if (!validator.isEmail(String(email).trim())) return ResponseService.badRequest(res, "Please enter a valid email");

        const staff = await staffModel.findOne({
            where: { is_deleted: false, [Op.and]: [sameEmail(email)] },
            include: [{ model: roleModel, as: "role", attributes: ["id", "name"] }],
        });
        if (!staff) return ResponseService.badRequest(res, "Invalid email or password");
        if (!staff.status) return ResponseService.badRequest(res, "Your account is inactive, contact the owner");

        const isMatch = await bcrypt.compare(String(password), staff.password_hash);
        if (!isMatch) return ResponseService.badRequest(res, "Invalid email or password");

        const hotel = await hotelModel.findOne({ where: { pk_hotel_id: staff.fk_hotel_id, is_deleted: false } });
        if (!hotel) return ResponseService.badRequest(res, "Your hotel is not active");

        return ResponseService.success(res, "Login successfully", { user: userDto(staff, staff.role, hotel), token: signToken(staff) });
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

/** Token se wapas user (page refresh par session wapas banane ke liye) */
const Me = async (req, res) => {
    try {
        const hotel = await hotelModel.findOne({ where: { pk_hotel_id: req.user.fk_hotel_id } });
        const staff = await staffModel.findOne({ where: { pk_staff_id: req.user.pk_staff_id } });
        return ResponseService.success(res, "Success", userDto(staff, { name: req.user.role }, hotel));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const ChangePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (isBlank(current_password) || isBlank(new_password)) {
            return ResponseService.badRequest(res, "Current and new password are required");
        }
        if (String(new_password).length < MIN_PASSWORD) {
            return ResponseService.badRequest(res, `New password must be at least ${MIN_PASSWORD} characters`);
        }
        const staff = await staffModel.findOne({ where: { pk_staff_id: req.user.pk_staff_id } });
        if (!(await bcrypt.compare(String(current_password), staff.password_hash))) {
            return ResponseService.badRequest(res, "Current password is wrong");
        }
        await staff.update({ password_hash: await bcrypt.hash(String(new_password), SALT_ROUNDS) });
        return ResponseService.success(res, "Password changed successfully");
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

/** Naya hotel + uska owner login ek saath (SaaS signup) */
const RegisterHotel = async (req, res) => {
    try {
        const { hotel_name, phone_number, hotel_address, owner_name, email, password } = req.body;
        if (isBlank(hotel_name)) return ResponseService.badRequest(res, "Hotel name is required");
        if (isBlank(phone_number)) return ResponseService.badRequest(res, "Phone number is required");
        if (isBlank(hotel_address)) return ResponseService.badRequest(res, "Hotel address is required");
        if (isBlank(owner_name)) return ResponseService.badRequest(res, "Owner name is required");
        if (isBlank(email) || !validator.isEmail(String(email).trim())) return ResponseService.badRequest(res, "Please enter a valid email");
        if (isBlank(password) || String(password).length < MIN_PASSWORD) {
            return ResponseService.badRequest(res, `Password must be at least ${MIN_PASSWORD} characters`);
        }

        if (await staffModel.findOne({ where: { [Op.and]: [sameEmail(email)] } })) {
            return ResponseService.conflict(res, "Email already exists");
        }

        const ownerRole = await roleModel.findOne({ where: { name: "owner", is_deleted: false } });
        if (!ownerRole) return ResponseService.error(res, "Roles are not set up. Run: npm run seed");

        const base = slugify(hotel_name);
        let slug = base;
        for (let n = 2; await hotelModel.findOne({ where: { hotel_slug: slug } }); n++) slug = `${base}-${n}`;

        const { hotel, staff } = await dbConnect.transaction(async (t) => {
            const hotel = await hotelModel.create({
                hotel_name: hotel_name.trim(),
                phone_number: String(phone_number).trim(),
                hotel_address: hotel_address.trim(),
                hotel_slug: slug,
            }, { transaction: t });
            await paymentMethodModel.bulkCreate(
                DEFAULT_PAYMENT_METHODS.map((m, i) => ({ ...m, fk_hotel_id: hotel.pk_hotel_id, sort_order: i })),
                { transaction: t },
            );
            const staff = await staffModel.create({
                fk_hotel_id: hotel.pk_hotel_id,
                fk_role_id: ownerRole.id,
                staff_name: owner_name.trim(),
                email: String(email).trim().toLowerCase(),
                password_hash: await bcrypt.hash(String(password), SALT_ROUNDS),
            }, { transaction: t });
            return { hotel, staff };
        });

        return ResponseService.created(res, "Hotel registered successfully", {
            user: userDto(staff, ownerRole, hotel),
            token: signToken(staff),
        });
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { Login, Me, ChangePassword, RegisterHotel };

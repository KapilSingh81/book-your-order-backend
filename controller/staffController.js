import bcrypt from "bcrypt";
import validator from "validator";
import { Op, fn, col, where as sqlWhere } from "sequelize";
import ResponseService from "../utils/httpService.js";
import { staffModel, roleModel } from "../model/index.js";
import { hotelIdOf, toId, isBlank } from "../utils/hotelScope.js";

const SALT_ROUNDS = 10;
const MIN_PASSWORD = 8;

/** password_hash kabhi response me nahi jayega */
const SAFE = { exclude: ["password_hash"] };
const safe = (staff) => {
    const { password_hash, ...rest } = staff.toJSON();
    return rest;
};

const sameEmail = (email) => sqlWhere(fn("lower", col("email")), email.trim().toLowerCase());

const create = async (req, res) => {
    try {
        const hotelId = hotelIdOf(req);
        const { staff_name, email, password, status } = req.body;
        const roleId = toId(req.body.fk_role_id);

        if (!hotelId) return ResponseService.badRequest(res, "Hotel id is required");
        if (isBlank(staff_name)) return ResponseService.badRequest(res, "Staff name is required");
        if (isBlank(email)) return ResponseService.badRequest(res, "Email is required");
        if (!validator.isEmail(String(email).trim())) return ResponseService.badRequest(res, "Please enter a valid email address");
        if (!roleId) return ResponseService.badRequest(res, "Role is required");
        if (isBlank(password) || String(password).length < MIN_PASSWORD) {
            return ResponseService.badRequest(res, `Password must be at least ${MIN_PASSWORD} characters`);
        }

        const role = await roleModel.findOne({ where: { id: roleId, is_deleted: false, status: true } });
        if (!role) return ResponseService.notFound(res, "Role not found");

        // Email poori system me ek hi baar (login isi se hoga), deleted staff ka bhi count hota hai
        const exists = await staffModel.findOne({ where: { [Op.and]: [sameEmail(email)] } });
        if (exists) return ResponseService.conflict(res, "Email already exists");

        const staff = await staffModel.create({
            fk_hotel_id: hotelId,
            fk_role_id: roleId,
            staff_name: staff_name.trim(),
            email: String(email).trim().toLowerCase(),
            password_hash: await bcrypt.hash(String(password), SALT_ROUNDS),
            status: status ?? true,
        });
        return ResponseService.created(res, "Staff created successfully", safe(staff));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const list = async (req, res) => {
    try {
        const hotelId = hotelIdOf(req);
        if (!hotelId) return ResponseService.badRequest(res, "Hotel id is required");

        const filter = { fk_hotel_id: hotelId, is_deleted: false };
        const roleId = toId(req.query.fk_role_id);
        if (roleId) filter.fk_role_id = roleId;
        if (req.query.status !== undefined) filter.status = req.query.status === "true";

        const staff = await staffModel.findAll({ where: filter, attributes: SAFE, order: [["pk_staff_id", "DESC"]] });
        return ResponseService.success(res, "Staff retrieved successfully", staff);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const getById = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid staff id is required");

        const staff = await staffModel.findOne({ where: { pk_staff_id: id, fk_hotel_id: hotelIdOf(req), is_deleted: false }, attributes: SAFE });
        if (!staff) return ResponseService.notFound(res, "Staff not found");

        return ResponseService.success(res, "Staff retrieved successfully", staff);
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const update = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid staff id is required");

        const staff = await staffModel.findOne({ where: { pk_staff_id: id, fk_hotel_id: hotelIdOf(req), is_deleted: false } });
        if (!staff) return ResponseService.notFound(res, "Staff not found");

        const { staff_name, email, password, status } = req.body;
        if (isBlank(staff_name)) return ResponseService.badRequest(res, "Staff name is required");

        let nextEmail = staff.email;
        if (email !== undefined) {
            if (isBlank(email) || !validator.isEmail(String(email).trim())) {
                return ResponseService.badRequest(res, "Please enter a valid email address");
            }
            nextEmail = String(email).trim().toLowerCase();
            const taken = await staffModel.findOne({ where: { pk_staff_id: { [Op.ne]: id }, [Op.and]: [sameEmail(nextEmail)] } });
            if (taken) return ResponseService.conflict(res, "Email already exists");
        }

        let nextRole = staff.fk_role_id;
        if (req.body.fk_role_id !== undefined) {
            nextRole = toId(req.body.fk_role_id);
            const role = nextRole && (await roleModel.findOne({ where: { id: nextRole, is_deleted: false, status: true } }));
            if (!role) return ResponseService.notFound(res, "Role not found");
        }

        const changes = { staff_name: staff_name.trim(), email: nextEmail, fk_role_id: nextRole, status: status ?? staff.status };

        // Password sirf tab badlega jab naya bheja ho
        if (!isBlank(password)) {
            if (String(password).length < MIN_PASSWORD) {
                return ResponseService.badRequest(res, `Password must be at least ${MIN_PASSWORD} characters`);
            }
            changes.password_hash = await bcrypt.hash(String(password), SALT_ROUNDS);
        }

        // Khud ko inactive nahi kar sakte, warna hotel ka aakhri login band ho sakta hai
        if (req.user?.pk_staff_id === id && changes.status === false) {
            return ResponseService.badRequest(res, "You cannot deactivate your own account");
        }

        await staff.update(changes);
        return ResponseService.success(res, "Staff updated successfully", safe(staff));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

const remove = async (req, res) => {
    try {
        const id = toId(req.params.id);
        if (!id) return ResponseService.badRequest(res, "Valid staff id is required");

        if (req.user?.pk_staff_id === id) {
            return ResponseService.badRequest(res, "You cannot delete your own account");
        }

        const staff = await staffModel.findOne({ where: { pk_staff_id: id, fk_hotel_id: hotelIdOf(req), is_deleted: false } });
        if (!staff) return ResponseService.notFound(res, "Staff not found");

        await staff.update({ is_deleted: true, status: false });
        return ResponseService.success(res, "Staff deleted successfully");
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { create, list, getById, update, remove };

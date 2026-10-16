import jwt from "jsonwebtoken";
import ResponseService from "../utils/httpService.js";
import { staffModel, roleModel, hotelModel } from "../model/index.js";

/**
 * Login check. Header: Authorization: Bearer <token>
 * Pass hone par req.user me staff aur uska hotel (fk_hotel_id) aa jata hai.
 */
const Auth = async (req, res, next) => {
    try {
        const header = req.headers["authorization"];
        if (!header) return ResponseService.unauthorized(res, "Unauthorized - Please login again");
        const token = header.startsWith("Bearer ") ? header.slice(7) : header;

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return ResponseService.unauthorized(
                res,
                err.name === "TokenExpiredError" ? "Session expired - Please login again" : "Unauthorized - Invalid token",
            );
        }

        const staff = await staffModel.findOne({
            where: { pk_staff_id: decoded.id, is_deleted: false },
            attributes: { exclude: ["password_hash"] },
            include: [{ model: roleModel, as: "role", attributes: ["id", "name"] }],
        });
        if (!staff) return ResponseService.unauthorized(res, "User not found");
        if (!staff.status) return ResponseService.unauthorized(res, "Your account is inactive, contact the owner");

        const hotel = await hotelModel.findOne({ where: { pk_hotel_id: staff.fk_hotel_id, is_deleted: false } });
        if (!hotel) return ResponseService.unauthorized(res, "Hotel not found");

        req.user = {
            pk_staff_id: staff.pk_staff_id,
            fk_hotel_id: staff.fk_hotel_id,
            fk_role_id: staff.fk_role_id,
            staff_name: staff.staff_name,
            email: staff.email,
            role: String(staff.role?.name ?? "").toLowerCase(),
        };
        next();
    } catch (error) {
        console.log(error);
        return ResponseService.error(res, error.message);
    }
};

/** Role check: router.use(Auth, allow("owner", "counter")). Owner ko hamesha ijazat hai */
export const allow = (...roles) => (req, res, next) => {
    const role = req.user?.role;
    if (role === "owner" || roles.includes(role)) return next();
    return ResponseService.forbidden(res, "You do not have permission to do this");
};

export default Auth;

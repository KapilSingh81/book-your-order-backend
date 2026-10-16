import fs from "fs";
import path from "path";
import ResponseService from "../utils/httpService.js";
import { hotelModel } from "../model/index.js";
import { hotelIdOf, isBlank } from "../utils/hotelScope.js";

const UPLOAD_DIR = "uploads";
const removeFile = (filename) => { if (filename) fs.unlink(path.join(UPLOAD_DIR, filename), () => {}); };
const optionalText = (v) => (isBlank(v) ? null : String(v).trim());

/** Website me https:// na ho to laga do (QR ka address galat na bane) */
const normaliseWebsite = (v) => {
    const t = optionalText(v);
    if (!t) return null;
    return /^https?:\/\//i.test(t) ? t.replace(/\/+$/, "") : `https://${t.replace(/\/+$/, "")}`;
};

export const hotelDto = (h) => ({
    pk_hotel_id: h.pk_hotel_id,
    hotel_name: h.hotel_name,
    hotel_slug: h.hotel_slug,
    tagline: h.tagline,
    phone_number: h.phone_number,
    hotel_address: h.hotel_address,
    GSTIN: h.GSTIN,
    website: h.website,
    logo: h.logo ? `/${UPLOAD_DIR}/${h.logo}` : null,
    tax_rate: Number(h.tax_rate),
    latitude: h.latitude === null ? null : Number(h.latitude),
    longitude: h.longitude === null ? null : Number(h.longitude),
    geo_radius_m: h.geo_radius_m,
    geo_mode: h.geo_mode,
});

/** Logged-in owner/staff ka apna hotel */
const getMine = async (req, res) => {
    try {
        const hotel = await hotelModel.findOne({ where: { pk_hotel_id: hotelIdOf(req), is_deleted: false } });
        if (!hotel) return ResponseService.notFound(res, "Hotel not found");
        return ResponseService.success(res, "Hotel retrieved successfully", hotelDto(hotel));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

/** Slug kabhi nahi badalta (chhape hue QR chalte rehne chahiye) */
const updateMine = async (req, res) => {
    const logo = req.file;
    try {
        const hotel = await hotelModel.findOne({ where: { pk_hotel_id: hotelIdOf(req), is_deleted: false } });
        const fail = (fn_, message) => { removeFile(logo?.filename); return fn_(res, message); };
        if (!hotel) return fail(ResponseService.notFound, "Hotel not found");

        const { hotel_name, phone_number, hotel_address, GSTIN, tagline, website, tax_rate, latitude, longitude, geo_radius_m, geo_mode } = req.body;
        const changes = {};

        if (hotel_name !== undefined) {
            if (isBlank(hotel_name)) return fail(ResponseService.badRequest, "Hotel name is required");
            changes.hotel_name = hotel_name.trim();
        }
        if (phone_number !== undefined) {
            if (isBlank(phone_number)) return fail(ResponseService.badRequest, "Phone number is required");
            changes.phone_number = String(phone_number).trim();
        }
        if (hotel_address !== undefined) {
            if (isBlank(hotel_address)) return fail(ResponseService.badRequest, "Hotel address is required");
            changes.hotel_address = hotel_address.trim();
        }
        if (GSTIN !== undefined) changes.GSTIN = optionalText(GSTIN);
        if (tagline !== undefined) changes.tagline = optionalText(tagline);
        if (website !== undefined) changes.website = normaliseWebsite(website);
        if (tax_rate !== undefined) {
            const rate = Number(tax_rate);
            if (!(rate >= 0 && rate <= 0.4)) return fail(ResponseService.badRequest, "Tax rate must be between 0 and 0.40 (0.05 = 5%)");
            changes.tax_rate = rate;
        }
        if (latitude !== undefined || longitude !== undefined) {
            if (isBlank(latitude) && isBlank(longitude)) { changes.latitude = null; changes.longitude = null; }
            else {
                const la = Number(latitude), lo = Number(longitude);
                if (!(la >= -90 && la <= 90) || !(lo >= -180 && lo <= 180) || isBlank(latitude) || isBlank(longitude)) {
                    return fail(ResponseService.badRequest, "Latitude and longitude must both be valid numbers");
                }
                changes.latitude = la; changes.longitude = lo;
            }
        }
        if (geo_radius_m !== undefined) {
            const r = Number(geo_radius_m);
            if (!Number.isInteger(r) || r < 30 || r > 5000) return fail(ResponseService.badRequest, "Radius must be between 30 and 5000 metres");
            changes.geo_radius_m = r;
        }
        if (geo_mode !== undefined) {
            if (!["off", "warn", "block"].includes(geo_mode)) return fail(ResponseService.badRequest, "Location check must be off, warn or block");
            changes.geo_mode = geo_mode;
        }
        const nextMode = changes.geo_mode ?? hotel.geo_mode;
        const hasPoint = (changes.latitude ?? hotel.latitude) !== null && (changes.longitude ?? hotel.longitude) !== null;
        if (nextMode !== "off" && !hasPoint) return fail(ResponseService.badRequest, "Set the hotel location first (use the 'Use my current location' button) before turning the location check on");
        const oldLogo = hotel.logo;
        if (logo) changes.logo = logo.filename;

        await hotel.update(changes);
        if (logo) removeFile(oldLogo);
        return ResponseService.success(res, "Hotel updated successfully", hotelDto(hotel));
    } catch (error) {
        removeFile(logo?.filename);
        return ResponseService.error(res, error.message);
    }
};

/** Public: slug se hotel ki basic info */
const getBySlug = async (req, res) => {
    try {
        const hotel = await hotelModel.findOne({ where: { hotel_slug: req.params.slug, is_deleted: false } });
        if (!hotel) return ResponseService.notFound(res, "Hotel not found");
        return ResponseService.success(res, "Hotel retrieved successfully", hotelDto(hotel));
    } catch (error) {
        return ResponseService.error(res, error.message);
    }
};

export { getMine, updateMine, getBySlug };

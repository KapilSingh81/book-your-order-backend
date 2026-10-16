/** Logged-in staff ka hotel. Sirf JWT se aata hai, body/query se kabhi nahi (warna koi dusre hotel ka data maang le). */
export const hotelIdOf = (req) => {
    const n = Number(req.user?.fk_hotel_id);
    return Number.isInteger(n) && n > 0 ? n : null;
};

/** "12" -> 12, warna null */
export const toId = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

export const isBlank = (v) => v === undefined || v === null || !String(v).trim();

/** multipart me boolean "true"/"false" string banke aata hai */
export const toBool = (value, fallback) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    return ["true", "1", "yes"].includes(String(value).toLowerCase());
};

export const toInt = (value, fallback) => {
    const n = Number(value);
    return value !== undefined && value !== null && value !== "" && Number.isInteger(n) ? n : fallback;
};

export const money = (n) => Math.round(Number(n) * 100) / 100;

export const slugify = (text) =>
    String(text).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 50) || "hotel";

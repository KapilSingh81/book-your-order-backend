import ResponseService from "../utils/httpService.js";

/** Chhota in-memory limiter (public routes ke liye). Bade deployment me express-rate-limit/redis use karo */
export const rateLimit = ({ windowMs = 60_000, max = 40 } = {}) => {
    const hits = new Map();
    setInterval(() => {
        const now = Date.now();
        for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    }, windowMs).unref();

    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        const entry = hits.get(key);
        if (!entry || entry.reset < now) {
            hits.set(key, { count: 1, reset: now + windowMs });
            return next();
        }
        entry.count += 1;
        if (entry.count > max) return ResponseService.tooManyRequests(res, "Too many requests. Please slow down");
        next();
    };
};

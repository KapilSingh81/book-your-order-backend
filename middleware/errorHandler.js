import ResponseService from "../utils/httpService.js";

export const notFoundHandler = (req, res) => ResponseService.notFound(res, `Route not found: ${req.method} ${req.originalUrl}`);

/** Multer ya kisi bhi route se aaya error JSON me jaye, HTML me nahi */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    if (err?.code === "LIMIT_FILE_SIZE") return ResponseService.badRequest(res, "Image must be 2 MB or smaller");
    if (err?.name === "MulterError" || err?.message === "Only image files are allowed") {
        return ResponseService.badRequest(res, err.message);
    }
    if (err?.type === "entity.parse.failed") return ResponseService.badRequest(res, "Invalid JSON body");
    console.log(err);
    return ResponseService.error(res, err?.message || "Internal Server Error");
};

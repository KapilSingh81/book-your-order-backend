class ResponseService {
    static success(res, message = "Success", data = null, statusCode = 200) {
        return res.status(statusCode).json({ success: true, message, data });
    }

    /** created(res, message, data)  -> 201 */
    static created(res, message = "Created", data = null) {
        return ResponseService.success(res, message, data, 201);
    }

    static error(res, message = "Internal Server Error", errors = null, statusCode = 500) {
        return res.status(statusCode).json({ success: false, message, errors: errors ?? statusCode });
    }

    static unauthorized(res, message = "Unauthorized") { return ResponseService.error(res, message, null, 401); }
    static forbidden(res, message = "Forbidden") { return ResponseService.error(res, message, null, 403); }
    static notFound(res, message = "Not Found") { return ResponseService.error(res, message, null, 404); }
    static conflict(res, message = "Conflict") { return ResponseService.error(res, message, null, 409); }
    static badRequest(res, message = "Bad Request", errors = null) { return ResponseService.error(res, message, errors, 400); }
    static unprocessable(res, message = "Unprocessable Entity", errors = null) { return ResponseService.error(res, message, errors, 422); }
    static tooManyRequests(res, message = "Too Many Requests") { return ResponseService.error(res, message, null, 429); }
    static internal(res, message = "Internal Server Error") { return ResponseService.error(res, message, null, 500); }
}

export default ResponseService;

/**
 * Custom Error Class
 * Permet de créer des erreurs personnalisées avec status code et message
 * 
 * @example
 * // Dans un controller
 * throw new ApiError(404, 'User not found');
 * throw new ApiError(400, 'Invalid email format');
 */

class ApiError extends Error {
    constructor(statusCode, message, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.name = 'ApiError';

        // Capture la stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    // Méthodes statiques pour les erreurs courantes
    static badRequest(message = 'Bad Request', errors = null) {
        return new ApiError(400, message, errors);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message);
    }

    static notFound(message = 'Resource not found') {
        return new ApiError(404, message);
    }

    static conflict(message = 'Conflict') {
        return new ApiError(409, message);
    }

    static internal(message = 'Internal Server Error') {
        return new ApiError(500, message);
    }
}

module.exports = ApiError;

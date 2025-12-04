const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

/**
 * Configuration de Multer pour upload d'images
 * - Validation stricte des fichiers
 * - Organisation par seller
 * - Gestion des erreurs
 */

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration du stockage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Organiser par seller
        const sellerId = req.user.userId;
        const sellerDir = path.join(uploadDir, sellerId.toString());

        if (!fs.existsSync(sellerDir)) {
            fs.mkdirSync(sellerDir, { recursive: true });
        }

        cb(null, sellerDir);
    },
    filename: function (req, file, cb) {
        // Nom unique : timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-');

        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// Filtre pour accepter uniquement les images
const fileFilter = (req, file, cb) => {
    // Types MIME autorisés
    const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG, WebP and GIF images are allowed.'), false);
    }
};

// Configuration Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max par image
        files: 10, // Maximum 10 images par upload
    }
});

// Middleware pour gérer les erreurs Multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(ApiError.badRequest('File size too large. Maximum size is 5MB.'));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return next(ApiError.badRequest('Too many files. Maximum is 10 images.'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(ApiError.badRequest('Unexpected field name.'));
        }
        return next(ApiError.badRequest(`Upload error: ${err.message}`));
    }
    next(err);
};

module.exports = {
    upload,
    handleMulterError,
    uploadDir,
};

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const ApiError = require('../utils/ApiError');

/**
 * Service d'optimisation d'images avec Sharp
 * - Compression intelligente
 * - Redimensionnement
 * - Génération de thumbnails
 * - Conversion WebP
 */

class ImageService {
    constructor() {
        this.sizes = {
            thumbnail: { width: 200, height: 200 },
            small: { width: 400, height: 400 },
            medium: { width: 800, height: 800 },
            large: { width: 1200, height: 1200 },
        };

        this.quality = {
            webp: 80,
            jpeg: 85,
            png: 90,
        };
    }

    /**
     * Optimiser une image uploadée
     * @param {String} filePath - Chemin du fichier original
     * @param {Object} options - Options d'optimisation
     * @returns {Object} - Informations sur l'image optimisée
     */
    async optimizeImage(filePath, options = {}) {
        try {
            const {
                generateThumbnail = true,
                convertToWebP = true,
                resize = 'large',
            } = options;

            const dir = path.dirname(filePath);
            const ext = path.extname(filePath);
            const basename = path.basename(filePath, ext);

            const results = {
                original: filePath,
                optimized: null,
                thumbnail: null,
                webp: null,
            };

            // Lire les métadonnées de l'image
            const metadata = await sharp(filePath).metadata();

            // 1. Optimiser l'image principale
            const size = this.sizes[resize] || this.sizes.large;
            const optimizedPath = path.join(dir, `${basename}-optimized${ext}`);

            await sharp(filePath)
                .resize(size.width, size.height, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .jpeg({ quality: this.quality.jpeg, progressive: true })
                .png({ quality: this.quality.png, compressionLevel: 9 })
                .toFile(optimizedPath);

            results.optimized = optimizedPath;

            // 2. Générer une miniature
            if (generateThumbnail) {
                const thumbnailPath = path.join(dir, `${basename}-thumb${ext}`);

                await sharp(filePath)
                    .resize(this.sizes.thumbnail.width, this.sizes.thumbnail.height, {
                        fit: 'cover',
                        position: 'center',
                    })
                    .jpeg({ quality: this.quality.jpeg })
                    .png({ quality: this.quality.png })
                    .toFile(thumbnailPath);

                results.thumbnail = thumbnailPath;
            }

            // 3. Convertir en WebP (meilleure compression)
            if (convertToWebP) {
                const webpPath = path.join(dir, `${basename}.webp`);

                await sharp(filePath)
                    .resize(size.width, size.height, {
                        fit: 'inside',
                        withoutEnlargement: true,
                    })
                    .webp({ quality: this.quality.webp })
                    .toFile(webpPath);

                results.webp = webpPath;
            }

            // 4. Supprimer l'original pour économiser l'espace
            await fs.unlink(filePath);

            return {
                ...results,
                metadata: {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format,
                    size: metadata.size,
                },
            };
        } catch (error) {
            throw new ApiError(500, `Image optimization failed: ${error.message}`);
        }
    }

    /**
     * Optimiser plusieurs images
     * @param {Array} files - Tableau de chemins de fichiers
     * @param {Object} options - Options d'optimisation
     * @returns {Array} - Tableau d'informations sur les images optimisées
     */
    async optimizeMultipleImages(files, options = {}) {
        const results = [];

        for (const file of files) {
            try {
                const optimized = await this.optimizeImage(file.path, options);
                results.push({
                    success: true,
                    originalName: file.originalname,
                    ...optimized,
                });
            } catch (error) {
                results.push({
                    success: false,
                    originalName: file.originalname,
                    error: error.message,
                });
            }
        }

        return results;
    }

    /**
     * Supprimer une image et ses variantes
     * @param {String} imagePath - Chemin de l'image
     */
    async deleteImage(imagePath) {
        try {
            const dir = path.dirname(imagePath);
            const ext = path.extname(imagePath);
            const basename = path.basename(imagePath, ext);

            // Supprimer toutes les variantes
            const variants = [
                imagePath,
                path.join(dir, `${basename}-optimized${ext}`),
                path.join(dir, `${basename}-thumb${ext}`),
                path.join(dir, `${basename}.webp`),
            ];

            for (const variant of variants) {
                try {
                    await fs.unlink(variant);
                } catch (error) {
                    // Ignorer si le fichier n'existe pas
                    if (error.code !== 'ENOENT') {
                        console.error(`Failed to delete ${variant}:`, error);
                    }
                }
            }

            return true;
        } catch (error) {
            throw new ApiError(500, `Failed to delete image: ${error.message}`);
        }
    }

    /**
     * Supprimer plusieurs images
     * @param {Array} imagePaths - Tableau de chemins d'images
     */
    async deleteMultipleImages(imagePaths) {
        const results = [];

        for (const imagePath of imagePaths) {
            try {
                await this.deleteImage(imagePath);
                results.push({ success: true, path: imagePath });
            } catch (error) {
                results.push({ success: false, path: imagePath, error: error.message });
            }
        }

        return results;
    }

    /**
     * Générer une URL relative pour l'image
     * @param {String} filePath - Chemin absolu du fichier
     * @returns {String} - URL relative
     */
    getImageUrl(filePath) {
        // Convertir le chemin absolu en URL relative
        const uploadsIndex = filePath.indexOf('uploads');
        if (uploadsIndex !== -1) {
            return '/' + filePath.substring(uploadsIndex).replace(/\\/g, '/');
        }
        return filePath;
    }
}

module.exports = new ImageService();

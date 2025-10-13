const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const validator = require("../middlewares/validationMiddleware");
const { CategorySchema } = require("../middlewares/schema");

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Gestion des catégories de produits
 */

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Créer une nouvelle catégorie
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom de la catégorie
 *                 example: "Électronique"
 *           example:
 *             name: "Électronique"
 *     responses:
 *       201:
 *         description: Catégorie créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *             example:
 *               _id: "64b5f123abc456def789"
 *               name: "Électronique"
 *               createdAt: "2023-07-17T10:30:00Z"
 *               updatedAt: "2023-07-17T10:30:00Z"
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Le nom de la catégorie est requis"
 *               status: 400
 */
router.post("/", validator.validate(CategorySchema), categoryController.createCategory);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Récupérer toutes les catégories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Liste des catégories récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *             example:
 *               - _id: "64b5f123abc456def789"
 *                 name: "Électronique"
 *                 createdAt: "2023-07-17T10:30:00Z"
 *                 updatedAt: "2023-07-17T10:30:00Z"
 *               - _id: "64b5f123abc456def790"
 *                 name: "Vêtements"
 *                 createdAt: "2023-07-17T11:00:00Z"
 *                 updatedAt: "2023-07-17T11:00:00Z"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Erreur interne du serveur"
 *               status: 500
 */
router.get("/", categoryController.getAllCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Récupérer une catégorie par ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la catégorie
 *         example: "64b5f123abc456def789"
 *     responses:
 *       200:
 *         description: Catégorie trouvée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *             example:
 *               _id: "64b5f123abc456def789"
 *               name: "Électronique"
 *               createdAt: "2023-07-17T10:30:00Z"
 *               updatedAt: "2023-07-17T10:30:00Z"
 *       404:
 *         description: Catégorie non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Catégorie non trouvée"
 *               status: 404
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Erreur interne du serveur"
 *               status: 500
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", categoryController.getCategoryById);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Mettre à jour une catégorie
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la catégorie à mettre à jour
 *         example: "64b5f123abc456def789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom de la catégorie
 *                 example: "Électronique et High-Tech"
 *           example:
 *             name: "Électronique et High-Tech"
 *     responses:
 *       200:
 *         description: Catégorie mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *             example:
 *               _id: "64b5f123abc456def789"
 *               name: "Électronique et High-Tech"
 *               createdAt: "2023-07-17T10:30:00Z"
 *               updatedAt: "2023-07-17T12:45:00Z"
 *       404:
 *         description: Catégorie non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Catégorie non trouvée"
 *               status: 404
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Le nom de la catégorie est requis"
 *               status: 400
 *       404:
 *         description: Catégorie non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", validator.validate(CategorySchema), categoryController.updateCategory);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Supprimer une catégorie
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID de la catégorie à supprimer
 *         example: "64b5f123abc456def789"
 *     responses:
 *       200:
 *         description: Catégorie supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Catégorie supprimée avec succès"
 *       404:
 *         description: Catégorie non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Catégorie non trouvée"
 *               status: 404
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Erreur interne du serveur"
 *               status: 500
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const validator = require("../middlewares/validationMiddleware");
const { productSchema } = require("../middlewares/schema");

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Gestion des produits
 */

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Créer un nouveau produit
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom du produit
 *                 example: "iPhone 14"
 *               description:
 *                 type: string
 *                 description: Description du produit
 *                 example: "Smartphone Apple dernière génération"
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Prix du produit
 *                 example: 999.99
 *               category:
 *                 type: string
 *                 description: ID de la catégorie
 *                 example: "64b5f123abc456def789"
 *               stock:
 *                 type: number
 *                 minimum: 0
 *                 description: Quantité en stock
 *                 example: 50
 *               imageUrl:
 *                 type: string
 *                 description: URL de l'image du produit
 *                 example: "https://example.com/images/iphone14.jpg"
 *           example:
 *             name: "iPhone 14"
 *             description: "Smartphone Apple dernière génération"
 *             price: 999.99
 *             category: "64b5f123abc456def789"
 *             stock: 50
 *             imageUrl: "https://example.com/images/iphone14.jpg"
 *     responses:
 *       201:
 *         description: Produit créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *             example:
 *               _id: "64b5f123abc456def791"
 *               name: "iPhone 14"
 *               description: "Smartphone Apple dernière génération"
 *               price: 999.99
 *               category: "64b5f123abc456def789"
 *               stock: 50
 *               imageUrl: "https://example.com/images/iphone14.jpg"
 *               createdAt: "2023-07-17T10:30:00Z"
 *               updatedAt: "2023-07-17T10:30:00Z"
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Le prix doit être un nombre positif"
 *               status: 400
 */
router.post("/", validator.validate(productSchema), productController.createProduct);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Récupérer tous les produits
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Liste des produits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", productController.getAllProducts);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Récupérer un produit par ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du produit
 *     responses:
 *       200:
 *         description: Produit trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produit non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", productController.getProductById);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Mettre à jour un produit
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du produit à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom du produit
 *               description:
 *                 type: string
 *                 description: Description du produit
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Prix du produit
 *               category:
 *                 type: string
 *                 description: ID de la catégorie
 *               stock:
 *                 type: number
 *                 minimum: 0
 *                 description: Quantité en stock
 *               imageUrl:
 *                 type: string
 *                 description: URL de l'image du produit
 *     responses:
 *       200:
 *         description: Produit mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produit non trouvé
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
router.put("/:id", validator.validate(productSchema), productController.updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Supprimer un produit
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID du produit à supprimer
 *     responses:
 *       200:
 *         description: Produit supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Produit supprimé avec succès
 *       404:
 *         description: Produit non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", productController.deleteProduct);

module.exports = router;

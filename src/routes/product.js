const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { createProductValidator, updateProductValidator } = require("../validators/productValidator");

router.post("/", createProductValidator, productController.createProduct);
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.put("/:id", updateProductValidator, productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

module.exports = router;

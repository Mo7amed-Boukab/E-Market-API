const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const validator = require("../middlewares/validationMiddleware");
const { productSchema } = require("../middlewares/schema");

router.post("/", validator.validate(productSchema), productController.createProduct);
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.put("/:id", validator.validate(productSchema), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

module.exports = router;

const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const validator = require("../middlewares/validationMiddleware");
const { CategorySchema } = require("../middlewares/schema");

router.post("/", validator.validate(CategorySchema), categoryController.createCategory);
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", validator.validate(CategorySchema), categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
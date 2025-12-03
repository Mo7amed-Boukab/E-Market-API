const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { createCategoryValidator, updateCategoryValidator } = require("../validators/categoryValidator");

router.post("/", createCategoryValidator, categoryController.createCategory);
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", updateCategoryValidator, categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
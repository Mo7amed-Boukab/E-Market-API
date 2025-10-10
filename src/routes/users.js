const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const validator = require("../middlewares/validationMiddleware");
const { userSchema } = require("../middlewares/schema");

router.post("/", validator.validate(userSchema), userController.createUser);
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.delete("/:id", userController.deleteUser);

module.exports = router;
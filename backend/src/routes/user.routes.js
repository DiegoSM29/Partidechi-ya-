const { Router } = require("express");
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

// Todas las rutas de perfil requieren un usuario autenticado
router.use(authenticate);

router.get("/me", userController.getMe);
router.patch("/me", userController.updateMe);

module.exports = router;

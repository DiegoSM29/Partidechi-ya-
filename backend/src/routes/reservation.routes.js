const { Router } = require("express");
const reservaController = require("../controllers/reserva.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

router.post("/", authenticate, reservaController.create);
router.get("/", authenticate, reservaController.list);
router.get("/:id", authenticate, reservaController.getById);
router.post("/:id/cancel", authenticate, reservaController.cancel);

module.exports = router;

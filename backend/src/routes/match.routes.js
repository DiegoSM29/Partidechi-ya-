const { Router } = require("express");
const partidoController = require("../controllers/partido.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

// Partidos amistosos
router.post("/", authenticate, partidoController.create);
router.get("/", partidoController.list);
router.get("/:id", partidoController.getById);
router.delete("/:id", authenticate, partidoController.remove);
router.patch("/:id", authenticate, partidoController.update);
router.post("/:id/join", authenticate, partidoController.join);
router.post("/:id/leave", authenticate, partidoController.leave);
router.get("/:id/participants", partidoController.getParticipants);

module.exports = router;

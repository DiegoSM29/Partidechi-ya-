const { Router } = require("express");
const canchaController = require("../controllers/cancha.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

const router = Router();

router.get("/", canchaController.listAll);
router.get("/mine", authenticate, authorize("PROPIETARIO"), canchaController.listMine);
router.post("/", authenticate, authorize("PROPIETARIO"), canchaController.create);
router.patch("/:id", authenticate, authorize("PROPIETARIO"), canchaController.updateMine);
router.delete("/:id", authenticate, authorize("PROPIETARIO"), canchaController.deleteMine);

module.exports = router;
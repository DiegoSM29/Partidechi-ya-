const { Router } = require("express");
const notificationController = require("../controllers/notificacion.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/", authenticate, notificationController.listMine);
router.patch("/:id/read", authenticate, notificationController.markRead);

module.exports = router;

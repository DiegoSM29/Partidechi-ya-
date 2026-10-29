const { Router } = require("express");
const pagoController = require("../controllers/pago.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

router.post("/:id/verify", authenticate, pagoController.verifyPayment);

module.exports = router;

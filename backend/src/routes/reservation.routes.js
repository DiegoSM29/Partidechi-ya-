const { Router } = require("express");
const reservaController = require("../controllers/reserva.controller");
const pagoController = require("../controllers/pago.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

router.post("/", authenticate, reservaController.create);
router.get("/", authenticate, reservaController.list);
router.get("/:id", authenticate, reservaController.getById);
router.post("/:id/cancel", authenticate, reservaController.cancel);
router.post("/:id/confirm", authenticate, reservaController.confirm);

// Pagos asociados a la reserva
router.get("/:id/payments/amount", authenticate, pagoController.getAmount);
router.post("/:id/payments/paypal/simulate", authenticate, pagoController.paypalSimulate);
router.post("/:id/payments", authenticate, pagoController.registerPayment);
router.get("/:id/payments", authenticate, pagoController.listPayments);

module.exports = router;

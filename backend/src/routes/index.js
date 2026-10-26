const { Router } = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const courtRoutes = require("./court.routes");
const reservationRoutes = require("./reservation.routes");
const paymentRoutes = require("./payment.routes");
const matchRoutes = require("./match.routes");

const router = Router();

// Endpoint de salud para verificacion del servidor
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API operativa",
    data: { servicio: "partidechi-api", version: "v1" },
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/courts", courtRoutes);
router.use("/reservations", reservationRoutes);
router.use("/payments", paymentRoutes);
router.use("/matches", matchRoutes);

module.exports = router;

const pagoService = require("../services/pago.service");
const asyncHandler = require("../utils/asyncHandler");

const getAmount = asyncHandler(async (req, res) => {
  const { reserva, amount, currency } = await pagoService.getAmount(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: "Importe a pagar obtenido correctamente",
    data: { reserva, amount, currency },
  });
});

const paypalSimulate = asyncHandler(async (req, res) => {
  const result = await pagoService.paypalSimulate(req.user, req.params.id, req.body);
  res.status(201).json({
    success: true,
    message: "Simulación de pago PayPal creada correctamente (pendiente de verificación)",
    data: result,
  });
});

const paypalCapture = asyncHandler(async (req, res) => {
  const result = await pagoService.paypalCapture(req.user, req.params.id, req.body);
  const message = result.alreadyConfirmed
    ? "La reserva ya se encontraba confirmada"
    : "Pago confirmado y reserva confirmada automáticamente";
  res.status(200).json({
    success: true,
    message,
    data: result,
  });
});

const registerPayment = asyncHandler(async (req, res) => {
  const result = await pagoService.registerPayment(req.user, req.params.id, req.body);
  res.status(201).json({
    success: true,
    message: "Pago registrado correctamente (pendiente de verificación)",
    data: result,
  });
});

const listPayments = asyncHandler(async (req, res) => {
  const result = await pagoService.listPayments(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: "Pagos consultados correctamente",
    data: result,
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const result = await pagoService.verifyPayment(req.user, req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: "Pago verificado correctamente",
    data: result,
  });
});

module.exports = { getAmount, paypalSimulate, paypalCapture, registerPayment, listPayments, verifyPayment };

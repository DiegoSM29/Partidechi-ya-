// Controlador de reservas (HU-03 valida horarios antes de ocupar la franja).
const reservaService = require("../services/reserva.service");
const asyncHandler = require("../utils/asyncHandler");

const create = asyncHandler(async (req, res) => {
  const input = { ...(req.body || {}) };
  // Permite tambien POST /courts/:id/reservations ademas de POST /reservations.
  if (req.params.id) input.id_cancha = req.params.id;
  const { reserva, cancha } = await reservaService.create(req.user, input);
  res.status(201).json({
    success: true,
    message: "Reserva solicitada correctamente",
    data: { reserva, cancha },
  });
});

const list = asyncHandler(async (req, res) => {
  const reservas = await reservaService.list(req.user);
  res.status(200).json({
    success: true,
    message: "Reservas consultadas correctamente",
    data: { reservas },
  });
});

const getById = asyncHandler(async (req, res) => {
  const reserva = await reservaService.getById(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: "Reserva consultada correctamente",
    data: { reserva },
  });
});

const cancel = asyncHandler(async (req, res) => {
  const reserva = await reservaService.cancel(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: "Reserva cancelada correctamente",
    data: { reserva },
  });
});

module.exports = { create, list, getById, cancel };

// Controlador de horarios y disponibilidad (HU-03).
const horarioService = require("../services/horario.service");
const asyncHandler = require("../utils/asyncHandler");

const listSchedules = asyncHandler(async (req, res) => {
  const { cancha, horarios } = await horarioService.listSchedules(req.params.id || req.params.canchaId || req.params.id_cancha);
  res.status(200).json({
    success: true,
    message: "Horarios consultados correctamente",
    data: { cancha, horarios },
  });
});

const createSchedules = asyncHandler(async (req, res) => {
  const { cancha, horarios } = await horarioService.createSchedules(
    req.user.id_usuario,
    req.params.id || req.params.canchaId || req.params.id_cancha,
    req.body
  );
  res.status(201).json({
    success: true,
    message: "Horario registrado correctamente",
    data: { cancha, horarios },
  });
});

const replaceSchedules = asyncHandler(async (req, res) => {
  const { cancha, horarios } = await horarioService.replaceSchedules(
    req.user.id_usuario,
    req.params.id || req.params.canchaId || req.params.id_cancha,
    req.body
  );
  res.status(200).json({
    success: true,
    message: "Horario de atencion actualizado correctamente",
    data: { cancha, horarios },
  });
});

const updateSchedule = asyncHandler(async (req, res) => {
  const { cancha, horario } = await horarioService.updateSchedule(
    req.user.id_usuario,
    req.params.id,
    req.params.scheduleId,
    req.body
  );
  res.status(200).json({
    success: true,
    message: "Horario actualizado correctamente",
    data: { cancha, horario },
  });
});

const deleteSchedule = asyncHandler(async (req, res) => {
  const { cancha, horarios } = await horarioService.deleteSchedule(
    req.user.id_usuario,
    req.params.id,
    req.params.scheduleId
  );
  res.status(200).json({
    success: true,
    message: "Horario eliminado correctamente",
    data: { cancha, horarios },
  });
});

const getAvailability = asyncHandler(async (req, res) => {
  const availability = await horarioService.getAvailability(req.params.id, req.query);
  res.status(200).json({
    success: true,
    message: "Disponibilidad consultada correctamente",
    data: availability,
  });
});

module.exports = {
  listSchedules,
  createSchedules,
  replaceSchedules,
  updateSchedule,
  deleteSchedule,
  getAvailability,
};

// Controlador de partidos amistosos
const partidoService = require("../services/partido.service");
const asyncHandler = require("../utils/asyncHandler");

const create = asyncHandler(async (req, res) => {
  const { partido } = await partidoService.create(req.user, req.body || {});
  res.status(201).json({
    success: true,
    message: "Partido creado correctamente",
    data: { partido },
  });
});

const list = asyncHandler(async (req, res) => {
  const partidos = await partidoService.list(req.query || {}, req.user);
  res.status(200).json({
    success: true,
    message: "Partidos consultados correctamente",
    data: { partidos },
  });
});

const getById = asyncHandler(async (req, res) => {
  const partido = await partidoService.getById(req.params.id);
  res.status(200).json({
    success: true,
    message: "Partido consultado correctamente",
    data: { partido },
  });
});

const update = asyncHandler(async (req, res) => {
  const partido = await partidoService.update(req.user, req.params.id, req.body || {});
  res.status(200).json({
    success: true,
    message: "Partido actualizado correctamente",
    data: { partido },
  });
});

const remove = asyncHandler(async (req, res) => {
  await partidoService.remove(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: "Partido eliminado correctamente",
    data: {},
  });
});

const join = asyncHandler(async (req, res) => {
  const partido = await partidoService.join(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: "Te has unido al partido correctamente",
    data: { partido },
  });
});

const leave = asyncHandler(async (req, res) => {
  const result = await partidoService.leave(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

const getParticipants = asyncHandler(async (req, res) => {
  const participantes = await partidoService.getParticipants(req.params.id);
  res.status(200).json({
    success: true,
    message: "Participantes consultados correctamente",
    data: { participantes },
  });
});

module.exports = { create, list, getById, update, remove, join, leave, getParticipants };

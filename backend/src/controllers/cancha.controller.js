const canchaService = require("../services/cancha.service");
const asyncHandler = require("../utils/asyncHandler");

const listAll = asyncHandler(async (req, res) => {
  const canchas = await canchaService.listAll();
  res.status(200).json({
    success: true,
    message: "Canchas consultadas correctamente",
    data: { canchas },
  });
});

const listMine = asyncHandler(async (req, res) => {
  const canchas = await canchaService.listMine(req.user.id_usuario);
  res.status(200).json({
    success: true,
    message: "Canchas consultadas correctamente",
    data: { canchas },
  });
});

const create = asyncHandler(async (req, res) => {
  const cancha = await canchaService.create(req.user.id_usuario, req.body);
  res.status(201).json({
    success: true,
    message: "Cancha registrada correctamente",
    data: { cancha },
  });
});

const updateMine = asyncHandler(async (req, res) => {
  const cancha = await canchaService.updateMine(
    req.user.id_usuario,
    req.params.id,
    req.body
  );
  res.status(200).json({
    success: true,
    message: "Cancha actualizada correctamente",
    data: { cancha },
  });
});

const deleteMine = asyncHandler(async (req, res) => {
  await canchaService.deleteMine(req.user.id_usuario, req.params.id);
  res.status(200).json({
    success: true,
    message: "Cancha eliminada correctamente",
    data: {},
  });
});

module.exports = { listAll, listMine, create, updateMine, deleteMine };
const canchaService = require("../services/cancha.service");
const asyncHandler = require("../utils/asyncHandler");

const listAll = asyncHandler(async (req, res) => {
  const filters = {
    deporte: req.query.deporte || req.query.sport || req.query.tipo,
    ubicacion:
      req.query.ubicacion ||
      req.query.ubicacion_search ||
      req.query.location ||
      req.query.ciudad ||
      req.query.direccion ||
      req.query.search ||
      req.query.zona,
    precio_min: req.query.precio_min || req.query.precioMin || req.query.min_price || req.query.minPrecio,
    precio_max: req.query.precio_max || req.query.precioMax || req.query.max_price || req.query.maxPrecio,
    fecha: req.query.fecha || req.query.date,
  };
  const canchas = await canchaService.listAll(filters);
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

const getById = asyncHandler(async (req, res) => {
  const canchaService = require("../services/cancha.service");
  const canchaRepository = require("../repositories/cancha.repository");
  const { parseId } = (() => {
    const ApiError = require("../utils/ApiError");
    return {
      parseId: (value) => {
        const id = Number(value);
        if (!Number.isInteger(id) || id < 1) {
          throw new ApiError(400, "El identificador de la cancha no es valido");
        }
        return id;
      },
    };
  })();
  const id_cancha = parseId(req.params.id);
  const cancha = await canchaRepository.findById(id_cancha);
  if (!cancha) {
    const ApiError = require("../utils/ApiError");
    throw new ApiError(404, "Cancha no encontrada");
  }
  res.status(200).json({
    success: true,
    message: "Cancha consultada correctamente",
    data: { cancha },
  });
});

module.exports = { listAll, listMine, create, updateMine, deleteMine, getById };
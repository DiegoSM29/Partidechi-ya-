const cierreService = require("../services/cierre.service");
const asyncHandler = require("../utils/asyncHandler");

const preview = asyncHandler(async (req, res) => {
  const data = await cierreService.preview(req.user.id_usuario, req.body);
  res.status(200).json({
    success: true,
    message: "Resumen del cierre consultado correctamente",
    data,
  });
});

const apply = asyncHandler(async (req, res) => {
  const data = await cierreService.apply(req.user.id_usuario, req.body);
  res.status(200).json({
    success: true,
    message: "Cierre aplicado correctamente",
    data,
  });
});

const listByDate = asyncHandler(async (req, res) => {
  const data = await cierreService.listByDate(req.user.id_usuario, req.query.fecha);
  res.status(200).json({
    success: true,
    message: "Cierres consultados correctamente",
    data,
  });
});

const reopen = asyncHandler(async (req, res) => {
  const data = await cierreService.reopen(
    req.user.id_usuario,
    req.params.id,
    req.query.fecha
  );
  res.status(200).json({
    success: true,
    message: "Cancha reabierta correctamente para la fecha indicada",
    data,
  });
});

module.exports = { preview, apply, listByDate, reopen };

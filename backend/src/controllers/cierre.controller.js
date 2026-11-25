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

module.exports = { preview, apply };

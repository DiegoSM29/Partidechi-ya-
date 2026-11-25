const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const listMine = asyncHandler(async (req, res) => {
  const notificaciones = await prisma.notificacion.findMany({
    where: { id_usuario: req.user.id_usuario },
    orderBy: { fecha_creacion: "desc" },
  });
  res.status(200).json({
    success: true,
    message: "Notificaciones consultadas correctamente",
    data: { notificaciones },
  });
});

const markRead = asyncHandler(async (req, res) => {
  const id_notificacion = Number(req.params.id);
  if (!Number.isInteger(id_notificacion) || id_notificacion < 1) {
    throw new ApiError(400, "El identificador de la notificacion no es valido");
  }
  const result = await prisma.notificacion.updateMany({
    where: { id_notificacion, id_usuario: req.user.id_usuario },
    data: { leida: true },
  });
  if (result.count === 0) throw new ApiError(404, "Notificacion no encontrada");
  const notificacion = await prisma.notificacion.findUnique({
    where: { id_notificacion },
  });
  res.status(200).json({
    success: true,
    message: "Notificacion marcada como leida",
    data: { notificacion },
  });
});

module.exports = { listMine, markRead };

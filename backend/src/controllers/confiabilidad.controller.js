const confiabilidadService = require("../services/confiabilidad.service");
const asyncHandler = require("../utils/asyncHandler");

const getMine = asyncHandler(async (req, res) => {
  const data = await confiabilidadService.getMine(req.user.id_usuario);
  res.status(200).json({ success: true, message: "Confiabilidad consultada correctamente", data });
});

const requestReview = asyncHandler(async (req, res) => {
  const revision = await confiabilidadService.requestReview(
    req.user.id_usuario,
    req.params.id,
    req.body || {}
  );
  res.status(201).json({ success: true, message: "Solicitud de revisión enviada", data: { revision } });
});

const listReports = asyncHandler(async (req, res) => {
  const reportes = await confiabilidadService.listAdminReports();
  res.status(200).json({ success: true, message: "Reportes consultados correctamente", data: { reportes } });
});

const decideReport = asyncHandler(async (req, res) => {
  const reporte = await confiabilidadService.decideNoShow(
    req.user.id_usuario,
    req.params.id,
    req.body || {}
  );
  res.status(200).json({ success: true, message: "Reporte resuelto correctamente", data: { reporte } });
});

const listReviews = asyncHandler(async (req, res) => {
  const revisiones = await confiabilidadService.listAdminReviews();
  res.status(200).json({ success: true, message: "Solicitudes consultadas correctamente", data: { revisiones } });
});

const decideReview = asyncHandler(async (req, res) => {
  const revision = await confiabilidadService.decideReview(
    req.user.id_usuario,
    req.params.id,
    req.body || {}
  );
  res.status(200).json({ success: true, message: "Revisión resuelta correctamente", data: { revision } });
});

const setScore = asyncHandler(async (req, res) => {
  const movimiento = await confiabilidadService.setAdminScore(
    req.user.id_usuario,
    req.params.id,
    req.body || {}
  );
  res.status(200).json({ success: true, message: "Puntaje corregido correctamente", data: { movimiento } });
});

module.exports = {
  getMine, requestReview, listReports, decideReport, listReviews, decideReview, setScore,
};

const ApiError = require("../utils/ApiError");

// Manejador de rutas inexistentes (debe ir antes del errorHandler)
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Recurso no encontrado: ${req.method} ${req.originalUrl}`));
};

// Middleware global de manejo de errores (ultimo middleware de la cadena).
// Normaliza errores de Prisma y errores de parseo del body JSON,
// y responde SIEMPRE con el formato JSON estandarizado:
// { success: false, error: "descripcion" }
const errorHandler = (err, req, res, next) => {
  // Guarda estandar: si la respuesta ya fue enviada (cliente desconectado u
  // otro fallo posterior al envio), delega al manejador por defecto de Express
  // en lugar de intentar responder dos veces (ERR_HTTP_HEADERS_SENT).
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || "Error interno del servidor";

  // Errores conocidos de Prisma ORM
  if (err.code === "P2002") {
    statusCode = 400;
    message = "Los datos ingresados duplican un registro existente (correo ya registrado)";
  } else if (err.code === "P2025") {
    statusCode = 404;
    message = "El recurso solicitado no existe";
  }

  // Errores de parseo / limites del body JSON (body-parser)
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Cuerpo JSON invalido";
  } else if (err.type === "entity.too.large") {
    statusCode = 400;
    message = "El cuerpo de la peticion excede el tamano permitido";
  }

  if (statusCode >= 500) {
    console.error("[ERROR 500]", err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

module.exports = { notFoundHandler, errorHandler };

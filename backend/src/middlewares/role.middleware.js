const ApiError = require("../utils/ApiError");

// Middleware de AUTORIZACION por roles.
// Uso: router.get("/ruta", authenticate, authorize("PROPIETARIO", "ADMINISTRADOR"), ctrl)
const authorize = (...rolesPermitidos) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Debe iniciar sesion para continuar"));
  }

  if (!rolesPermitidos.includes(req.user.rol)) {
    return next(
      new ApiError(403, "No tiene permisos para realizar esta operacion")
    );
  }

  next();
};

module.exports = { authorize };

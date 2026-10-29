const ApiError = require("../utils/ApiError");
const { verifyToken } = require("../utils/jwt");
const { isRevoked } = require("../utils/tokenBlocklist");
const usuarioRepository = require("../repositories/usuario.repository");

// Middleware de AUTENTICACION (JWT).
// Verifica el token de la cabecera "Authorization: Bearer <token>",
// comprueba que no haya sido revocado por un logout y carga el usuario en req.user.
const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new ApiError(401, "Token de autenticacion no proporcionado");
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      throw new ApiError(401, "Token invalido o expirado");
    }

    if (isRevoked(payload.jti)) {
      throw new ApiError(401, "La sesion fue cerrada. Vuelva a iniciar sesion");
    }

    const usuario = await usuarioRepository.findById(payload.sub);
    if (!usuario) {
      throw new ApiError(401, "El usuario del token ya no existe");
    }
    if (usuario.estado !== "ACTIVO") {
      throw new ApiError(403, "La cuenta se encuentra desactivada");
    }

    req.user = {
      id_usuario: usuario.id_usuario,
      correo: usuario.correo,
      rol: usuario.rol,
      jti: payload.jti,
      exp: payload.exp,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate };

// Servicio de autenticacion (HU-01): registro, login y logout
const bcrypt = require("bcryptjs");
const ApiError = require("../utils/ApiError");
const { signToken } = require("../utils/jwt");
const tokenBlocklist = require("../utils/tokenBlocklist");
const usuarioRepository = require("../repositories/usuario.repository");
const { toPublicUser } = require("../utils/user.util");
const { env } = require("../config/env");
const { isNonEmptyString, isValidEmail, cleanString } = require("../utils/validators");

// Roles que pueden autoregistrarse. El rol administrador NO se otorga
// mediante registro publico (se gestiona desde la administracion).
const ROLES_REGISTRO = {
  jugador: "JUGADOR",
  propietario: "PROPIETARIO",
};

const validarRegistro = ({ nombre, apellido, correo, password, rol, telefono }) => {
  if (!isNonEmptyString(nombre)) {
    throw new ApiError(400, 'El campo "nombre" es obligatorio');
  }
  if (!isNonEmptyString(apellido)) {
    throw new ApiError(400, 'El campo "apellido" es obligatorio');
  }
  if (!isNonEmptyString(correo)) {
    throw new ApiError(400, 'El campo "correo" es obligatorio');
  }
  if (!isValidEmail(correo)) {
    throw new ApiError(400, "El formato del correo electronico no es valido");
  }
  if (!isNonEmptyString(password)) {
    throw new ApiError(400, 'El campo "password" es obligatorio');
  }
  if (String(password).length < 8) {
    throw new ApiError(400, "La contraseña debe tener al menos 8 caracteres");
  }
  if (rol !== undefined && rol !== null && rol !== "" && !ROLES_REGISTRO[rol]) {
    throw new ApiError(
      403,
      'Rol no permitido para el registro. Utilice "jugador" o "propietario"'
    );
  }
  if (telefono !== undefined && telefono !== null && telefono !== "" && typeof telefono !== "string") {
    throw new ApiError(400, 'El campo "telefono" debe ser texto');
  }
};

const generarToken = (usuario) =>
  signToken({
    sub: usuario.id_usuario,
    correo: usuario.correo,
    rol: usuario.rol,
  });

const register = async (input) => {
  validarRegistro(input);

  const correo = cleanString(input.correo).toLowerCase();

  const existente = await usuarioRepository.findByCorreo(correo);
  if (existente) {
    throw new ApiError(400, "El correo electronico ya esta registrado");
  }

  const password_hash = await bcrypt.hash(String(input.password), env.BCRYPT_ROUNDS);

  const usuario = await usuarioRepository.create({
    nombre: cleanString(input.nombre),
    apellido: cleanString(input.apellido),
    correo,
    password_hash,
    rol: ROLES_REGISTRO[input.rol] || "JUGADOR",
    telefono: isNonEmptyString(input.telefono) ? cleanString(input.telefono) : null,
  });

  return {
    user: toPublicUser(usuario),
    token: generarToken(usuario),
  };
};

const login = async ({ correo, password }) => {
  if (!isNonEmptyString(correo) || !isNonEmptyString(password)) {
    throw new ApiError(400, 'Los campos "correo" y "password" son obligatorios');
  }

  const usuario = await usuarioRepository.findByCorreo(cleanString(correo).toLowerCase());

  const contraseñaValida = usuario
    ? await bcrypt.compare(String(password), usuario.password_hash)
    : false;

  if (!usuario || !contraseñaValida) {
    throw new ApiError(401, "Credenciales incorrectas");
  }

  if (usuario.estado !== "ACTIVO") {
    throw new ApiError(403, "La cuenta se encuentra desactivada. Contacte al administrador");
  }

  return {
    user: toPublicUser(usuario),
    token: generarToken(usuario),
  };
};

const logout = async ({ jti, exp }) => {
  if (jti && exp) {
    tokenBlocklist.revoke(jti, exp * 1000);
  }
};

module.exports = { register, login, logout };

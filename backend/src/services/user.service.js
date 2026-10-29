// Servicio de usuarios (HU-01): perfil propio del usuario autenticado
const bcrypt = require("bcryptjs");
const ApiError = require("../utils/ApiError");
const usuarioRepository = require("../repositories/usuario.repository");
const { toPublicUser } = require("../utils/user.util");
const { env } = require("../config/env");
const { isNonEmptyString, isValidEmail, cleanString } = require("../utils/validators");

const getMe = async (id_usuario) => {
  const usuario = await usuarioRepository.findById(id_usuario);
  if (!usuario) {
    throw new ApiError(404, "Usuario no encontrado");
  }
  return toPublicUser(usuario);
};

const updateMe = async (id_usuario, input = {}) => {
  const data = {};

  // Nombre y apellido
  if (input.nombre !== undefined) {
    if (!isNonEmptyString(input.nombre)) {
      throw new ApiError(400, 'El campo "nombre" no puede estar vacio');
    }
    data.nombre = cleanString(input.nombre);
  }
  if (input.apellido !== undefined) {
    if (!isNonEmptyString(input.apellido)) {
      throw new ApiError(400, 'El campo "apellido" no puede estar vacio');
    }
    data.apellido = cleanString(input.apellido);
  }

  // Telefono (admite null para vaciarlo)
  if (input.telefono !== undefined) {
    if (input.telefono !== null && typeof input.telefono !== "string") {
      throw new ApiError(400, 'El campo "telefono" debe ser texto o null');
    }
    data.telefono = isNonEmptyString(input.telefono) ? cleanString(input.telefono) : null;
  }

  // Correo (unico): valida formato y que no pertenezca a otro usuario
  if (input.correo !== undefined) {
    if (!isNonEmptyString(input.correo) || !isValidEmail(input.correo)) {
      throw new ApiError(400, "El formato del correo electronico no es valido");
    }
    const correo = cleanString(input.correo).toLowerCase();
    const duplicado = await usuarioRepository.findByCorreo(correo);
    if (duplicado && duplicado.id_usuario !== id_usuario) {
      throw new ApiError(400, "El correo electronico ya esta registrado");
    }
    data.correo = correo;
  }

  // contraseña: exige la contraseña actual para confirmar la identidad
  if (input.password !== undefined) {
    if (!isNonEmptyString(input.password_actual)) {
      throw new ApiError(400, 'Debe indicar "password_actual" para cambiar la contraseña');
    }
    if (String(input.password).length < 8) {
      throw new ApiError(400, "La nueva contraseña debe tener al menos 8 caracteres");
    }
    const usuario = await usuarioRepository.findById(id_usuario);
    const coincide = await bcrypt.compare(
      String(input.password_actual),
      usuario.password_hash
    );
    if (!coincide) {
      throw new ApiError(400, "La contraseña actual es incorrecta");
    }
    data.password_hash = await bcrypt.hash(String(input.password), env.BCRYPT_ROUNDS);
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "No se recibieron campos para actualizar");
  }

  const actualizado = await usuarioRepository.update(id_usuario, data);
  return toPublicUser(actualizado);
};

module.exports = { getMe, updateMe };

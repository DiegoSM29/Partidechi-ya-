// Repositorio de usuarios: centraliza las consultas sobre la tabla "usuarios"
const prisma = require("../config/prisma");

const findByCorreo = (correo) =>
  prisma.usuario.findUnique({ where: { correo } });

const findById = (id_usuario) =>
  prisma.usuario.findUnique({ where: { id_usuario } });

const create = (data) => prisma.usuario.create({ data });

const update = (id_usuario, data) =>
  prisma.usuario.update({ where: { id_usuario }, data });

module.exports = { findByCorreo, findById, create, update };

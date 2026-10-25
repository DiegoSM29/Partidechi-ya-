const prisma = require("../config/prisma");

const findByPartidoAndUsuario = (id_partido, id_usuario, client = prisma) =>
  client.participante.findUnique({
    where: {
      id_partido_id_usuario: {
        id_partido,
        id_usuario,
      },
    },
  });

const create = (data, client = prisma) => client.participante.create({ data });

const update = (id_participante, data, client = prisma) =>
  client.participante.update({ where: { id_participante }, data });

const findByPartido = (id_partido, client = prisma) =>
  client.participante.findMany({
    where: { id_partido },
    include: {
      usuario: {
        select: { id_usuario: true, nombre: true, apellido: true, correo: true },
      },
    },
    orderBy: { fecha_union: "asc" },
  });

module.exports = { findByPartidoAndUsuario, create, update, findByPartido };

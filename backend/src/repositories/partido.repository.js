const prisma = require("../config/prisma");

const create = (data, client = prisma) => client.partido.create({ data });

const findById = (id_partido, client = prisma) =>
  client.partido.findUnique({
    where: { id_partido },
    include: {
      organizador: {
        select: { id_usuario: true, nombre: true, apellido: true, correo: true },
      },
      reserva: {
        include: {
          cancha: true,
        },
      },
      participantes: {
        include: {
          usuario: {
            select: { id_usuario: true, nombre: true, apellido: true, correo: true },
          },
        },
      },
    },
  });

const findMany = (where = {}, client = prisma) =>
  client.partido.findMany({
    where,
    orderBy: { fecha_hora: "asc" },
    include: {
      organizador: {
        select: { id_usuario: true, nombre: true, apellido: true },
      },
      reserva: {
        include: {
          cancha: { select: { id_cancha: true, nombre: true, ubicacion: true, deporte: true } },
        },
      },
      _count: {
        select: { participantes: true },
      },
    },
  });

const update = (id_partido, data, client = prisma) =>
  client.partido.update({ where: { id_partido }, data });

const remove = (id_partido, client = prisma) =>
  client.partido.delete({ where: { id_partido } });

module.exports = { create, findById, findMany, update, remove };

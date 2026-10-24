const prisma = require("../config/prisma");

const CANCHA_SELECT = {
  id_cancha: true,
  nombre: true,
  ubicacion: true,
  deporte: true,
  precio_hora: true,
  id_propietario: true,
};

const findByCourtAndDate = (id_cancha, fecha, client = prisma) =>
  client.reserva.findMany({
    where: { id_cancha, fecha, estado: { not: "CANCELADA" } },
    orderBy: [{ hora_inicio: "asc" }, { id_reserva: "asc" }],
    select: {
      id_reserva: true,
      hora_inicio: true,
      hora_fin: true,
      estado: true,
    },
  });

// Reservas activas de una cancha en una fecha que chocan con [hora_inicio, hora_fin).
const findOverlapping = (id_cancha, fecha, hora_inicio, hora_fin, client = prisma) =>
  client.reserva.findMany({
    where: {
      id_cancha,
      fecha,
      estado: { not: "CANCELADA" },
      hora_inicio: { lt: hora_fin },
      hora_fin: { gt: hora_inicio },
    },
    select: { id_reserva: true, hora_inicio: true, hora_fin: true, estado: true },
  });

const create = (data, client = prisma) => client.reserva.create({ data });

const findById = (id_reserva, client = prisma) =>
  client.reserva.findUnique({
    where: { id_reserva },
    include: { cancha: { select: CANCHA_SELECT } },
  });

const findMany = (where, client = prisma) =>
  client.reserva.findMany({
    where,
    orderBy: [{ fecha: "desc" }, { hora_inicio: "asc" }],
    include: { cancha: { select: CANCHA_SELECT } },
  });

const updateEstado = (id_reserva, estado, client = prisma) =>
  client.reserva.update({ where: { id_reserva }, data: { estado } });

module.exports = {
  findByCourtAndDate,
  findOverlapping,
  create,
  findById,
  findMany,
  updateEstado,
};

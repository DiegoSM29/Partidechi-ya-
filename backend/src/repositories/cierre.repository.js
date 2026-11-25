const prisma = require("../config/prisma");

const findOwnedCourts = (id_propietario, id_canchas, client = prisma) =>
  client.cancha.findMany({
    where: { id_propietario, id_cancha: { in: id_canchas } },
    select: { id_cancha: true, nombre: true },
    orderBy: { id_cancha: "asc" },
  });

const findClosures = (id_canchas, fecha, client = prisma) =>
  client.cierreCancha.findMany({
    where: { id_cancha: { in: id_canchas }, fecha },
    select: { id_cancha: true },
  });

const findAffectedReservations = (id_canchas, fecha, client = prisma) =>
  client.reserva.findMany({
    where: {
      id_cancha: { in: id_canchas },
      fecha,
      estado: { in: ["PENDIENTE", "CONFIRMADA"] },
    },
    orderBy: [{ id_cancha: "asc" }, { hora_inicio: "asc" }],
    select: {
      id_reserva: true,
      id_usuario: true,
      id_cancha: true,
      hora_inicio: true,
      hora_fin: true,
      estado: true,
      cancha: { select: { nombre: true } },
      usuario: { select: { nombre: true, apellido: true } },
    },
  });

const createClosures = (data, client = prisma) =>
  client.cierreCancha.createMany({ data });

const cancelActiveReservations = (id_canchas, fecha, client = prisma) =>
  client.reserva.updateMany({
    where: {
      id_cancha: { in: id_canchas },
      fecha,
      estado: { in: ["PENDIENTE", "CONFIRMADA"] },
    },
    data: { estado: "CANCELADA" },
  });

const createNotifications = (data, client = prisma) =>
  data.length > 0 ? client.notificacion.createMany({ data }) : Promise.resolve({ count: 0 });

const isClosed = (id_cancha, fecha, client = prisma) =>
  client.cierreCancha.findUnique({
    where: { id_cancha_fecha: { id_cancha, fecha } },
    select: { id_cierre: true },
  });

module.exports = {
  findOwnedCourts,
  findClosures,
  findAffectedReservations,
  createClosures,
  cancelActiveReservations,
  createNotifications,
  isClosed,
};

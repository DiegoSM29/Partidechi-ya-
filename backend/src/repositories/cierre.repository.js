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

const findClosureDatesForCourt = (id_cancha, inicio, fin, client = prisma) =>
  client.cierreCancha.findMany({
    where: { id_cancha, fecha: { gte: inicio, lt: fin } },
    select: { fecha: true },
  });

const findOwnedClosures = (id_propietario, fecha, client = prisma) =>
  client.cierreCancha.findMany({
    where: { fecha, cancha: { id_propietario } },
    select: {
      id_cierre: true,
      id_cancha: true,
      fecha: true,
      creado_en: true,
      cancha: { select: { nombre: true } },
    },
    orderBy: [{ id_cancha: "asc" }],
  });

const findOwnedCourt = (id_propietario, id_cancha, client = prisma) =>
  client.cancha.findFirst({
    where: { id_propietario, id_cancha },
    select: { id_cancha: true, nombre: true },
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
      partido: {
        select: { id_partido: true, nombre: true, estado: true },
      },
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

const cancelAffectedMatches = (id_reservas, client = prisma) =>
  id_reservas.length === 0
    ? Promise.resolve({ count: 0 })
    : client.partido.updateMany({
        where: {
          id_reserva: { in: id_reservas },
          estado: { in: ["PUBLICADO", "PRIVADO"] },
        },
        data: { estado: "CANCELADO" },
      });

const findAcceptedParticipantsForMatches = (id_partidos, client = prisma) =>
  id_partidos.length === 0
    ? Promise.resolve([])
    : client.participante.findMany({
        where: { id_partido: { in: id_partidos }, estado: "ACEPTADO" },
        select: {
          id_usuario: true,
          partido: { select: { nombre: true } },
        },
      });

const createNotifications = (data, client = prisma) =>
  data.length > 0 ? client.notificacion.createMany({ data }) : Promise.resolve({ count: 0 });

const isClosed = (id_cancha, fecha, client = prisma) =>
  client.cierreCancha.findUnique({
    where: { id_cancha_fecha: { id_cancha, fecha } },
    select: { id_cierre: true },
  });

const deleteClosure = (id_cancha, fecha, client = prisma) =>
  client.cierreCancha.deleteMany({ where: { id_cancha, fecha } });

module.exports = {
  findOwnedCourts,
  findClosures,
  findClosureDatesForCourt,
  findOwnedClosures,
  findOwnedCourt,
  findAffectedReservations,
  createClosures,
  cancelActiveReservations,
  cancelAffectedMatches,
  findAcceptedParticipantsForMatches,
  createNotifications,
  isClosed,
  deleteClosure,
};

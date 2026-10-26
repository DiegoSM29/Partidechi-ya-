const prisma = require("../config/prisma");

const CANCHA_SELECT = {
  id_cancha: true,
  nombre: true,
  ubicacion: true,
  deporte: true,
  categoria: true,
  precio_hora: true,
  id_propietario: true,
};

const USUARIO_SELECT = {
  id_usuario: true,
  nombre: true,
  apellido: true,
  correo: true,
  telefono: true,
};

const PAGO_SELECT = {
  id_pago: true,
  monto: true,
  metodo_pago: true,
  referencia: true,
  comprobante_url: true,
  estado: true,
  verificado_por: true,
  fecha_pago: true,
  fecha_verificacion: true,
};

const RESERVA_INCLUDE = {
  cancha: { select: CANCHA_SELECT },
  usuario: { select: USUARIO_SELECT },
  pagos: { orderBy: { fecha_pago: "desc" }, select: PAGO_SELECT },
  partido: { select: { id_partido: true, nombre: true, estado: true } },
};

const findByCourtAndDate = (id_cancha, fecha, client = prisma) =>
  client.reserva.findMany({
    where: { id_cancha, fecha, estado: { in: ["CONFIRMADA", "PENDIENTE"] } },
    orderBy: [{ hora_inicio: "asc" }, { id_reserva: "asc" }],
    select: {
      id_reserva: true,
      hora_inicio: true,
      hora_fin: true,
      estado: true,
    },
  });

// Reservas que bloquean la cancha (pendientes por pagar o confirmadas)
const findOverlapping = (id_cancha, fecha, hora_inicio, hora_fin, client = prisma) =>
  client.reserva.findMany({
    where: {
      id_cancha,
      fecha,
      estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      hora_inicio: { lt: hora_fin },
      hora_fin: { gt: hora_inicio },
    },
    select: { id_reserva: true, hora_inicio: true, hora_fin: true, estado: true },
  });

const create = (data, client = prisma) => client.reserva.create({ data });

const findById = (id_reserva, client = prisma) =>
  client.reserva.findUnique({
    where: { id_reserva },
    include: RESERVA_INCLUDE,
  });

const findMany = (where, client = prisma) =>
  client.reserva.findMany({
    where,
    orderBy: [{ fecha: "desc" }, { hora_inicio: "asc" }],
    include: RESERVA_INCLUDE,
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

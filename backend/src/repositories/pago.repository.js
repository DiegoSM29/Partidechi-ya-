const prisma = require("../config/prisma");

const create = (data, client = prisma) => client.pago.create({ data });

const findById = (id_pago, client = prisma) =>
  client.pago.findUnique({
    where: { id_pago },
    include: {
      reserva: {
        include: {
          cancha: true,
          usuario: true,
        },
      },
    },
  });

const findByReservation = (id_reserva, client = prisma) =>
  client.pago.findMany({
    where: { id_reserva },
    orderBy: { fecha_pago: "desc" },
  });

module.exports = { create, findById, findByReservation };

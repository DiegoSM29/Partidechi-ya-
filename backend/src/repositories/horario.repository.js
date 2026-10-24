const prisma = require("../config/prisma");

const ORDER = [{ dia_semana: "asc" }, { hora_inicio: "asc" }, { id_horario: "asc" }];

const findByCourtId = (id_cancha, client = prisma) =>
  client.horario.findMany({ where: { id_cancha }, orderBy: ORDER });

const findByCourtIdAndDay = (id_cancha, dia_semana, client = prisma) =>
  client.horario.findMany({
    where: { id_cancha, dia_semana },
    orderBy: [{ hora_inicio: "asc" }, { id_horario: "asc" }],
  });

const findByIdAndCourt = (id_horario, id_cancha, client = prisma) =>
  client.horario.findFirst({ where: { id_horario, id_cancha } });

const create = (data, client = prisma) => client.horario.create({ data });

const createMany = (data, client = prisma) =>
  client.horario.createMany({ data });

const update = (id_horario, data, client = prisma) =>
  client.horario.update({ where: { id_horario }, data });

const deleteByIdAndCourt = (id_horario, id_cancha, client = prisma) =>
  client.horario.deleteMany({ where: { id_horario, id_cancha } });

const deleteByCourt = (id_cancha, client = prisma) =>
  client.horario.deleteMany({ where: { id_cancha } });

module.exports = {
  findByCourtId,
  findByCourtIdAndDay,
  findByIdAndCourt,
  create,
  createMany,
  update,
  deleteByIdAndCourt,
  deleteByCourt,
};

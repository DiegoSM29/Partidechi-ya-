const prisma = require("../config/prisma");

const findAll = () =>
  prisma.cancha.findMany({ orderBy: { fecha_registro: "desc" } });

const findByOwner = (id_propietario) =>
  prisma.cancha.findMany({
    where: { id_propietario },
    orderBy: { fecha_registro: "desc" },
  });

const findById = (id_cancha) =>
  prisma.cancha.findUnique({ where: { id_cancha } });

const create = (data) => prisma.cancha.create({ data });

const findByOwnerAndId = (id_propietario, id_cancha) =>
  prisma.cancha.findFirst({ where: { id_propietario, id_cancha } });

const updateByOwnerAndId = async (id_propietario, id_cancha, data) => {
  const result = await prisma.cancha.updateMany({
    where: { id_propietario, id_cancha },
    data,
  });
  if (result.count === 0) return null;
  return findByOwnerAndId(id_propietario, id_cancha);
};

const deleteByOwnerAndId = (id_propietario, id_cancha) =>
  prisma.cancha.deleteMany({ where: { id_propietario, id_cancha } });

module.exports = {
  findAll,
  findByOwner,
  findById,
  create,
  findByOwnerAndId,
  updateByOwnerAndId,
  deleteByOwnerAndId,
};
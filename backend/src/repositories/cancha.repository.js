const prisma = require("../config/prisma");

const buildFilters = (filters = {}) => {
  const where = {};
  if (filters.deporte) {
    where.deporte = { equals: filters.deporte, mode: "insensitive" };
  }
  if (filters.ubicacion || filters.ubicacion_search || filters.search) {
    const term = filters.ubicacion || filters.ubicacion_search || filters.search;
    where.ubicacion = { contains: term, mode: "insensitive" };
  }
  if (filters.precio_max !== undefined && filters.precio_max !== null && filters.precio_max !== "") {
    where.precio_hora = {};
    where.precio_hora.lte = Number(filters.precio_max);
  } else if (filters.precio_min !== undefined && filters.precio_min !== null && filters.precio_min !== "") {
    // Keep backward compatible if passed, but UI will not send it
    where.precio_hora = {};
    where.precio_hora.gte = Number(filters.precio_min);
  }

  if (filters.fecha) {
    try {
      const fechaStr = String(filters.fecha);
      const date = new Date(fechaStr + "T00:00:00");
      if (!Number.isNaN(date.getTime())) {
        const dia_semana = date.getDay();
        where.horarios = { some: { dia_semana } };
      }
    } catch (e) {
      // ignore date filter if invalid
    }
  }
  return where;
};

const findAll = (filters = {}) => {
  const where = buildFilters(filters);
  return prisma.cancha.findMany({
    where,
    orderBy: { fecha_registro: "desc" },
    include: { horarios: true },
  });
};

const findByOwner = (id_propietario) =>
  prisma.cancha.findMany({
    where: { id_propietario },
    orderBy: { fecha_registro: "desc" },
  });

const findById = (id_cancha) =>
  prisma.cancha.findUnique({ where: { id_cancha }, include: { horarios: true } });

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
// Servicio de partidos amistosos
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const partidoRepository = require("../repositories/partido.repository");
const participanteRepository = require("../repositories/participante.repository");
const reservaRepository = require("../repositories/reserva.repository");

const parseId = (value, entidad = "partido") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(400, `El identificador de la ${entidad} no es valido`);
  }
  return id;
};

const create = async (usuario, input = {}) => {
  const id_reserva = parseId(input.id_reserva ?? input.reserva_id ?? input.idReserva, "reserva");
  const nombre = (input.nombre ?? input.name ?? "").trim();
  let deporte = (input.deporte ?? input.sport ?? "").trim();
  const jugadores_maximos = Number(input.jugadores_maximos ?? input.jugadoresMaximos ?? input.max_jugadores);
  const descripcion = input.descripcion ?? input.description ?? null;

  if (!nombre) throw new ApiError(400, "El nombre del partido es obligatorio");
  if (!Number.isInteger(jugadores_maximos) || jugadores_maximos < 1) {
    throw new ApiError(400, "El número máximo de jugadores debe ser válido");
  }

  const reserva = await reservaRepository.findById(id_reserva);
  if (!reserva) throw new ApiError(404, "Reserva no encontrada");
  if (reserva.id_usuario !== usuario.id_usuario) {
    throw new ApiError(403, "Solo el usuario que solicitó la reserva puede crear el partido");
  }
  if (reserva.estado !== "CONFIRMADA") {
    throw new ApiError(400, "El partido debe estar asociado a una reserva válida y confirmada");
  }
  if (!deporte && reserva.cancha?.deporte) {
    deporte = reserva.cancha.deporte;
  }
  if (!deporte) throw new ApiError(400, "El deporte es obligatorio");
  // Verificar que no exista ya un partido para esta reserva
  const existing = await prisma.partido.findUnique({ where: { id_reserva } });
  if (existing) {
    throw new ApiError(400, "Ya existe un partido asociado a esta reserva");
  }

  const fecha_hora = new Date(`${reserva.fecha.toISOString().split("T")[0]}T${reserva.hora_inicio}:00`);
  // Si la fecha ya viene con hora, también podríamos usarla, pero usar reserva es más consistente

  let partido;
  try {
    partido = await prisma.$transaction(async (tx) => {
      const created = await partidoRepository.create(
        {
          id_organizador: usuario.id_usuario,
          id_reserva,
          nombre,
          deporte,
          fecha_hora,
          jugadores_maximos,
          descripcion,
          estado: "PUBLICADO",
        },
        tx
      );
      // Agregar organizador como participante aceptado
      await participanteRepository.create(
        {
          id_partido: created.id_partido,
          id_usuario: usuario.id_usuario,
          estado: "ACEPTADO",
        },
        tx
      );
      return created;
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(400, "Ya existe un partido asociado a esta reserva");
    }
    throw error;
  }

  return { partido: await partidoRepository.findById(partido.id_partido) };
};

const list = async (filters = {}) => {
  const where = {};
  if (filters.estado) where.estado = filters.estado;
  else where.estado = "PUBLICADO";
  if (filters.deporte) where.deporte = { equals: filters.deporte, mode: "insensitive" };
  return partidoRepository.findMany(where);
};

const getById = async (rawId) => {
  const id_partido = parseId(rawId);
  const partido = await partidoRepository.findById(id_partido);
  if (!partido) throw new ApiError(404, "Partido no encontrado");
  return partido;
};

const update = async (usuario, rawId, input = {}) => {
  const id_partido = parseId(rawId);
  const partido = await partidoRepository.findById(id_partido);
  if (!partido) throw new ApiError(404, "Partido no encontrado");

  // Un partido creado por un jugador es definitivo: la confirmacion previa a
  // la creacion advierte que no se podra modificar despues. Solo un
  // administrador puede intervenir para moderar el partido.
  if (usuario.rol !== "ADMINISTRADOR") {
    throw new ApiError(403, "El partido no puede modificarse después de su creación");
  }

  const data = {};
  if (input.nombre !== undefined) data.nombre = input.nombre.trim();
  if (input.descripcion !== undefined) data.descripcion = input.descripcion;
  if (input.jugadores_maximos !== undefined) {
    const jm = Number(input.jugadores_maximos);
    if (!Number.isInteger(jm) || jm < 1) throw new ApiError(400, "El número máximo de jugadores debe ser válido");
    data.jugadores_maximos = jm;
  }
  if (input.estado !== undefined && usuario.rol === "ADMINISTRADOR") {
    data.estado = input.estado;
  }

  await partidoRepository.update(id_partido, data);
  return partidoRepository.findById(id_partido);
};

const remove = async (usuario, rawId) => {
  const id_partido = parseId(rawId);
  const partido = await partidoRepository.findById(id_partido);
  if (!partido) throw new ApiError(404, "Partido no encontrado");
  if (partido.id_organizador !== usuario.id_usuario) {
    throw new ApiError(403, "Solo el organizador puede eliminar el partido");
  }
  if (partido.estado !== "PUBLICADO") {
    throw new ApiError(400, "Solo se pueden eliminar partidos publicados");
  }
  if (partido.fecha_hora.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
    throw new ApiError(400, "El partido solo puede eliminarse con al menos 24 horas de anticipación");
  }

  await partidoRepository.remove(id_partido);
};

const join = async (usuario, rawId) => {
  const id_partido = parseId(rawId);
  if (usuario.rol !== "JUGADOR") {
    throw new ApiError(403, "Solo los jugadores pueden unirse a un partido");
  }

  await prisma.$transaction(async (tx) => {
    await partidoRepository.lockForUpdate(id_partido, tx);
    const partido = await partidoRepository.findById(id_partido, tx);
    if (!partido) throw new ApiError(404, "Partido no encontrado");
    if (partido.estado !== "PUBLICADO") {
      throw new ApiError(400, "No es posible unirse a un partido no publicado");
    }
    if (Date.now() > partido.fecha_hora.getTime() - 30 * 60 * 1000) {
      throw new ApiError(400, "La asistencia solo se puede confirmar hasta 30 minutos antes del partido");
    }

    const existing = await participanteRepository.findByPartidoAndUsuario(
      id_partido,
      usuario.id_usuario,
      tx
    );
    if (existing && existing.estado === "ACEPTADO") {
      throw new ApiError(400, "Ya te encuentras unido a este partido");
    }
    if (existing && existing.estado !== "ABANDONADO") {
      throw new ApiError(400, "No es posible confirmar la asistencia a este partido");
    }

    const participantesAceptados = await participanteRepository.countAccepted(id_partido, tx);
    if (participantesAceptados >= partido.jugadores_maximos) {
      throw new ApiError(400, "El partido ya alcanzó el número máximo de jugadores");
    }

    if (existing) {
      await participanteRepository.update(
        existing.id_participante,
        { estado: "ACEPTADO", fecha_union: new Date() },
        tx
      );
    } else {
      await participanteRepository.create(
        {
          id_partido,
          id_usuario: usuario.id_usuario,
          estado: "ACEPTADO",
        },
        tx
      );
    }
  });

  return partidoRepository.findById(id_partido);
};

const leave = async (usuario, rawId) => {
  const id_partido = parseId(rawId);
  const partido = await partidoRepository.findById(id_partido);
  if (!partido) throw new ApiError(404, "Partido no encontrado");
  if (partido.id_organizador === usuario.id_usuario) {
    throw new ApiError(400, "El organizador no puede abandonar el partido");
  }
  const existing = await participanteRepository.findByPartidoAndUsuario(id_partido, usuario.id_usuario);
  if (!existing || existing.estado !== "ACEPTADO") {
    throw new ApiError(400, "No te encuentras unido a este partido");
  }
  await participanteRepository.update(existing.id_participante, { estado: "ABANDONADO" });
  return { message: "Has abandonado el partido correctamente" };
};

const getParticipants = async (rawId) => {
  const id_partido = parseId(rawId);
  const partido = await partidoRepository.findById(id_partido);
  if (!partido) throw new ApiError(404, "Partido no encontrado");
  return participanteRepository.findByPartido(id_partido);
};

module.exports = { create, list, getById, update, remove, join, leave, getParticipants };

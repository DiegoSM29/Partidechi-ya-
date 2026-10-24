// Servicio de reservas: valida horarios registrados y reservas existentes.
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const canchaRepository = require("../repositories/cancha.repository");
const horarioRepository = require("../repositories/horario.repository");
const reservaRepository = require("../repositories/reserva.repository");
const {
  normalizeTime,
  timeToMinutes,
  intervalsOverlap,
  isIntervalCovered,
  parseDateOnly,
  todayDateOnly,
} = require("../utils/scheduleTime");

const parseId = (value, entidad = "reserva") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(400, `El identificador de la ${entidad} no es valido`);
  }
  return id;
};

const parseReservationInput = (input = {}) => {
  const id_cancha = parseId(
    input.id_cancha ?? input.cancha_id ?? input.court_id ?? input.idCancha,
    "cancha"
  );
  const fechaInfo = parseDateOnly(input.fecha ?? input.date);
  if (!fechaInfo) {
    throw new ApiError(400, 'La fecha debe tener el formato "YYYY-MM-DD"');
  }
  const hora_inicio = normalizeTime(
    input.hora_inicio ?? input.inicio ?? input.start ?? input.horaInicio
  );
  const hora_fin = normalizeTime(
    input.hora_fin ?? input.fin ?? input.end ?? input.horaFin
  );
  if (!hora_inicio || !hora_fin) {
    throw new ApiError(400, 'Las horas deben tener el formato "HH:mm"');
  }
  if (timeToMinutes(hora_inicio) >= timeToMinutes(hora_fin)) {
    throw new ApiError(400, "La hora de inicio debe ser anterior a la hora de fin");
  }
  if (fechaInfo.fechaTexto < todayDateOnly()) {
    throw new ApiError(400, "No se puede reservar una fecha pasada");
  }
  return { id_cancha, fechaInfo, hora_inicio, hora_fin };
};

const assertCourtIsBookable = async (
  { id_cancha, fechaInfo, hora_inicio, hora_fin },
  tx
) => {
  const horarios = await horarioRepository.findByCourtIdAndDay(
    id_cancha,
    fechaInfo.dia_semana,
    tx
  );
  if (horarios.length === 0) {
    throw new ApiError(
      400,
      "La cancha no tiene horario de atencion configurado para ese dia"
    );
  }
  if (!isIntervalCovered(hora_inicio, hora_fin, horarios)) {
    throw new ApiError(
      400,
      "El horario solicitado esta fuera del horario de atencion de la cancha"
    );
  }

  const reservas = await reservaRepository.findOverlapping(
    id_cancha,
    fechaInfo.fecha,
    hora_inicio,
    hora_fin,
    tx
  );
  if (reservas.length > 0) {
    throw new ApiError(400, "La cancha ya tiene una reserva en el horario solicitado");
  }
};

const create = async (usuario, input = {}) => {
  const { id_cancha, fechaInfo, hora_inicio, hora_fin } = parseReservationInput(input);
  const cancha = await canchaRepository.findById(id_cancha);
  if (!cancha) throw new ApiError(404, "Cancha no encontrada");

  const duracionHoras = (timeToMinutes(hora_fin) - timeToMinutes(hora_inicio)) / 60;
  const monto_total =
    Math.round(duracionHoras * Number(cancha.precio_hora) * 100) / 100;

  let reserva;
  try {
    reserva = await prisma.$transaction(
      async (tx) => {
        await assertCourtIsBookable(
          { id_cancha, fechaInfo, hora_inicio, hora_fin },
          tx
        );
        return reservaRepository.create(
          {
            id_usuario: usuario.id_usuario,
            id_cancha,
            fecha: fechaInfo.fecha,
            hora_inicio,
            hora_fin,
            monto_total,
            estado: "PENDIENTE",
          },
          tx
        );
      },
      { isolationLevel: "Serializable" }
    );
  } catch (error) {
    if (error.code === "P2034") {
      throw new ApiError(
        400,
        "La cancha acaba de recibir otra reserva en ese horario. Intente nuevamente"
      );
    }
    throw error;
  }

  return { reserva, cancha };
};

const assertCanAccess = (usuario, reserva) => {
  if (usuario.rol === "ADMINISTRADOR") return;
  if (reserva.id_usuario === usuario.id_usuario) return;
  if (reserva.cancha?.id_propietario === usuario.id_usuario) return;
  throw new ApiError(403, "No tiene permisos para consultar esta reserva");
};

const list = async (usuario) => {
  if (usuario.rol === "ADMINISTRADOR") {
    return reservaRepository.findMany({});
  }
  if (usuario.rol === "PROPIETARIO") {
    return reservaRepository.findMany({
      cancha: { id_propietario: usuario.id_usuario },
    });
  }
  return reservaRepository.findMany({ id_usuario: usuario.id_usuario });
};

const getById = async (usuario, rawId) => {
  const id_reserva = parseId(rawId);
  const reserva = await reservaRepository.findById(id_reserva);
  if (!reserva) throw new ApiError(404, "Reserva no encontrada");
  assertCanAccess(usuario, reserva);
  return reserva;
};

const cancel = async (usuario, rawId) => {
  const id_reserva = parseId(rawId);
  const reserva = await reservaRepository.findById(id_reserva);
  if (!reserva) throw new ApiError(404, "Reserva no encontrada");
  assertCanAccess(usuario, reserva);
  if (reserva.estado === "CANCELADA") {
    throw new ApiError(400, "La reserva ya fue cancelada");
  }
  if (reserva.estado === "COMPLETADA") {
    throw new ApiError(400, "No se puede cancelar una reserva completada");
  }
  return reservaRepository.updateEstado(id_reserva, "CANCELADA");
};

module.exports = { create, list, getById, cancel };

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

const ESTADOS_RESERVA = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"];
const ESTADOS_PAGO = ["PENDIENTE", "APROBADO", "RECHAZADO", "REEMBOLSADO"];

const parseId = (value, entidad = "reserva") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(400, `El identificador de la ${entidad} no es valido`);
  }
  return id;
};

const parseEnumFilter = (value, permitidos, entidad) => {
  if (value === undefined || value === null || value === "") return null;
  const normalizado = String(value).trim().toUpperCase();
  if (!permitidos.includes(normalizado)) {
    throw new ApiError(
      400,
      `El estado de ${entidad} debe ser uno de: ${permitidos.join(", ")}`
    );
  }
  return normalizado;
};

// Construye los filtros de consulta de reservas. El propietario solo puede
// consultar las reservas de sus propias canchas; ese filtro se agrega despues
// en list() y no puede ser sobrescrito por el cliente.
const buildFilters = (input = {}) => {
  const where = {};
  const idCanchaRaw =
    input.id_cancha ?? input.cancha_id ?? input.court_id ?? input.idCancha;

  if (idCanchaRaw !== undefined && idCanchaRaw !== null && idCanchaRaw !== "") {
    where.id_cancha = parseId(idCanchaRaw, "cancha");
  }

  const estado = parseEnumFilter(input.estado ?? input.status, ESTADOS_RESERVA, "reserva");
  if (estado) where.estado = estado;

  const estadoPagoRaw = input.estado_pago ?? input.payment_status ?? input.estadoPago;
  if (
    estadoPagoRaw !== undefined &&
    estadoPagoRaw !== null &&
    String(estadoPagoRaw).trim() !== ""
  ) {
    const estadoPago = String(estadoPagoRaw).trim().toUpperCase();
    if (estadoPago === "SIN_PAGO" || estadoPago === "SIN_PAGOS") {
      where.pagos = { none: {} };
    } else {
      if (!ESTADOS_PAGO.includes(estadoPago)) {
        throw new ApiError(
          400,
          `El estado de pago debe ser uno de: ${ESTADOS_PAGO.join(", ")}, SIN_PAGO`
        );
      }
      where.pagos = { some: { estado: estadoPago } };
    }
  }

  return where;
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
  if (duracionHoras <= 0) {
    throw new ApiError(400, "La duración de la reserva debe ser mayor a cero");
  }
  const monto_total =
    Math.round(duracionHoras * Number(cancha.precio_hora) * 100) / 100;

  let reserva;
  try {
    reserva = await prisma.$transaction(
      async (tx) => {
        // Validar que esté cubierto por horario de atención
        await assertCourtIsBookable(
          { id_cancha, fechaInfo, hora_inicio, hora_fin },
          tx
        );
        // Verificar que no haya reserva activa (pendiente o confirmada) solapante
        const solapantesActivas = await tx.reserva.findMany({
          where: {
            id_cancha,
            fecha: fechaInfo.fecha,
            estado: { in: ["PENDIENTE", "CONFIRMADA"] },
            hora_inicio: { lt: hora_fin },
            hora_fin: { gt: hora_inicio },
          },
        });
        if (solapantesActivas.length > 0) {
          throw new ApiError(400, "La cancha ya tiene una reserva en el horario solicitado");
        }
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

const list = async (usuario, filters = {}) => {
  const where = buildFilters(filters);

  if (usuario.rol === "ADMINISTRADOR") {
    return reservaRepository.findMany(where);
  }
  if (usuario.rol === "PROPIETARIO") {
    // Se fuerza la pertenencia por propietario: aunque el cliente envie un
    // id_cancha ajeno, la consulta no devuelve reservas de canchas ajenas.
    where.cancha = { id_propietario: usuario.id_usuario };
    return reservaRepository.findMany(where);
  }
  where.id_usuario = usuario.id_usuario;
  return reservaRepository.findMany(where);
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

const confirm = async (usuario, rawId) => {
  const id_reserva = parseId(rawId);
  const reserva = await reservaRepository.findById(id_reserva);
  if (!reserva) throw new ApiError(404, "Reserva no encontrada");
  assertCanAccess(usuario, reserva);

  if (usuario.rol !== "PROPIETARIO" && usuario.rol !== "ADMINISTRADOR") {
    throw new ApiError(403, "Solo el propietario o administrador puede confirmar la reserva");
  }
  if (usuario.rol === "PROPIETARIO" && reserva.cancha?.id_propietario !== usuario.id_usuario) {
    throw new ApiError(403, "No tiene permisos para confirmar esta reserva");
  }

  if (reserva.estado === "CANCELADA") {
    throw new ApiError(400, "No se puede confirmar una reserva cancelada");
  }
  if (reserva.estado === "CONFIRMADA") {
    throw new ApiError(400, "La reserva ya se encuentra confirmada");
  }
  if (reserva.estado === "COMPLETADA") {
    throw new ApiError(400, "No se puede confirmar una reserva completada");
  }

  // Verificar que exista un pago verificado/aprobado para el importe exigido
  const pagoAprobado = await prisma.pago.findFirst({
    where: {
      id_reserva,
      estado: "APROBADO",
    },
    orderBy: { fecha_verificacion: "desc" },
  });
  if (!pagoAprobado) {
    throw new ApiError(400, "La reserva solo se confirma después de verificar el pago exigido");
  }

  // Validar disponibilidad nuevamente (evitar confirmaciones incompatibles)
  const solapantes = await prisma.reserva.findMany({
    where: {
      id_cancha: reserva.id_cancha,
      fecha: reserva.fecha,
      estado: "CONFIRMADA",
      NOT: { id_reserva },
      hora_inicio: { lt: reserva.hora_fin },
      hora_fin: { gt: reserva.hora_inicio },
    },
  });
  if (solapantes.length > 0) {
    throw new ApiError(400, "No se puede confirmar la reserva por conflicto con otra reserva confirmada");
  }

  const reservaActualizada = await reservaRepository.updateEstado(id_reserva, "CONFIRMADA");
  return reservaRepository.findById(id_reserva);
};

module.exports = { create, list, getById, cancel, confirm };

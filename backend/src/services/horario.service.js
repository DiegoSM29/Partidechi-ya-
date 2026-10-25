// Servicio de horarios de funcionamiento y disponibilidad.
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const canchaRepository = require("../repositories/cancha.repository");
const horarioRepository = require("../repositories/horario.repository");
const reservaRepository = require("../repositories/reserva.repository");
const {
  DIAS_SEMANA,
  normalizeTime,
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  parseDiaSemana,
  nombreDia,
  parseDateOnly,
  todayDateOnly,
} = require("../utils/scheduleTime");

const parseId = (value, entidad = "cancha") => {
  if (value === undefined || value === null) {
    throw new ApiError(400, `El identificador de la ${entidad} no es valido`);
  }
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) {
    throw new ApiError(400, `El identificador de la ${entidad} no es valido`);
  }
  const id = Number(str);
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(400, `El identificador de la ${entidad} no es valido`);
  }
  return id;
};

const getCourt = async (rawId) => {
  const id_cancha = parseId(rawId);
  const cancha = await canchaRepository.findById(id_cancha);
  if (!cancha) throw new ApiError(404, "Cancha no encontrada");
  return cancha;
};

const getOwnedCourt = async (id_propietario, rawId) => {
  const id_cancha = parseId(rawId);
  const cancha = await canchaRepository.findByOwnerAndId(id_propietario, id_cancha);
  if (!cancha) throw new ApiError(404, "Cancha no encontrada");
  return cancha;
};

// Normaliza una franja horaria recibida por la API. Acepta una fecha para
// derivar el dia de la semana cuando no se envia "dia_semana".
const buildSchedulePayload = (item) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ApiError(400, "Los datos del horario no son validos");
  }
  const estado = item.estado ?? item.status;
  if (
    estado !== undefined &&
    estado !== null &&
    estado !== "" &&
    !["DISPONIBLE", "AVAILABLE"].includes(String(estado).trim().toUpperCase())
  ) {
    throw new ApiError(
      400,
      "Solo se pueden registrar horarios de funcionamiento; las horas no registradas no estarán disponibles"
    );
  }
  if (item.motivo || item.reason) {
    throw new ApiError(400, "Los horarios de funcionamiento no admiten motivos");
  }

  let diaRaw =
    item.dia_semana ?? item.dia ?? item.day ?? item.diaSemana ?? item.weekday;
  if (diaRaw === undefined && (item.fecha !== undefined || item.fecha_inicio !== undefined)) {
    const fecha = parseDateOnly(item.fecha ?? item.fecha_inicio);
    if (!fecha) {
      throw new ApiError(400, 'La fecha debe tener el formato "YYYY-MM-DD"');
    }
    diaRaw = fecha.dia_semana;
  }
  const dia_semana = parseDiaSemana(diaRaw);
  if (dia_semana === null) {
    throw new ApiError(
      400,
      'El dia de la semana debe ser un numero entre 0 (domingo) y 6 (sabado) o su nombre'
    );
  }

  const inicioRaw = item.hora_inicio ?? item.inicio ?? item.start ?? item.horaInicio;
  const finRaw = item.hora_fin ?? item.fin ?? item.end ?? item.horaFin;
  const hora_inicio = normalizeTime(inicioRaw);
  const hora_fin = normalizeTime(finRaw);
  if (!hora_inicio || !hora_fin) {
    throw new ApiError(400, 'Las horas deben tener el formato "HH:mm"');
  }
  if (timeToMinutes(hora_inicio) >= timeToMinutes(hora_fin)) {
    throw new ApiError(400, "La hora de inicio debe ser anterior a la hora de fin");
  }

  return { dia_semana, hora_inicio, hora_fin };
};

// Extrae una o varias franjas del cuerpo de la peticion.
const extractItems = (input) => {
  if (Array.isArray(input)) return input;
  if (!input || typeof input !== "object") {
    throw new ApiError(400, "Envía al menos un horario");
  }
  for (const key of ["horarios", "schedules", "items"]) {
    if (Array.isArray(input[key])) return input[key];
  }
  return [input];
};

const describeRange = (franja) =>
  `${nombreDia(franja.dia_semana)} de ${franja.hora_inicio} a ${franja.hora_fin}`;

const assertNoConflicts = (candidate, others, ignoreId = null) => {
  const conflicto = others.find(
    (otro) =>
      otro.id_horario !== ignoreId &&
      otro.dia_semana === candidate.dia_semana &&
      intervalsOverlap(
        candidate.hora_inicio,
        candidate.hora_fin,
        otro.hora_inicio,
        otro.hora_fin
      )
  );
  if (!conflicto) return;
  throw new ApiError(
    400,
    `El horario de atencion se superpone con otro existente (${describeRange(conflicto)})`
  );
};

const assertInternalConflicts = (payloads) => {
  payloads.forEach((candidate, index) => {
    assertNoConflicts(candidate, payloads.slice(0, index));
  });
};

const listSchedules = async (rawId) => {
  const cancha = await getCourt(rawId);
  const horarios = await horarioRepository.findByCourtId(cancha.id_cancha);
  return { cancha, horarios };
};

const createSchedules = async (id_propietario, rawId, input) => {
  const cancha = await getOwnedCourt(id_propietario, rawId);
  const items = extractItems(input);
  if (items.length === 0) throw new ApiError(400, "Envía al menos un horario");
  const payloads = items.map((item) => ({
    ...buildSchedulePayload(item),
    id_cancha: cancha.id_cancha,
  }));
  assertInternalConflicts(payloads);

  await prisma.$transaction(async (tx) => {
    const actuales = await horarioRepository.findByCourtId(cancha.id_cancha, tx);
    for (const payload of payloads) {
      assertNoConflicts(payload, actuales);
      const creado = await horarioRepository.create(payload, tx);
      actuales.push(creado);
    }
  });

  const horarios = await horarioRepository.findByCourtId(cancha.id_cancha);
  return { cancha, horarios };
};

// Reemplaza por completo el horario de atencion semanal.
const replaceSchedules = async (id_propietario, rawId, input) => {
  const cancha = await getOwnedCourt(id_propietario, rawId);
  if (input === undefined || input === null) {
    throw new ApiError(400, "Envía el arreglo de horarios");
  }
  const items = extractItems(input);
  const payloads = items.map((item) => ({
    ...buildSchedulePayload(item),
    id_cancha: cancha.id_cancha,
  }));
  assertInternalConflicts(payloads);
  await prisma.$transaction(async (tx) => {
    await horarioRepository.deleteByCourt(cancha.id_cancha, tx);
    if (payloads.length > 0) {
      await horarioRepository.createMany(payloads, tx);
    }
  });

  const horarios = await horarioRepository.findByCourtId(cancha.id_cancha);
  return { cancha, horarios };
};

const updateSchedule = async (id_propietario, rawId, rawScheduleId, input) => {
  const cancha = await getOwnedCourt(id_propietario, rawId);
  const id_horario = parseId(rawScheduleId, "franja horaria");
  const actual = await horarioRepository.findByIdAndCourt(id_horario, cancha.id_cancha);
  if (!actual) throw new ApiError(404, "Horario no encontrado");
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "Los datos del horario no son validos");
  }

  const payload = buildSchedulePayload(
    {
      dia_semana:
        input.dia_semana ?? input.dia ?? input.day ?? input.diaSemana ?? input.weekday ?? actual.dia_semana,
      hora_inicio:
        input.hora_inicio ?? input.inicio ?? input.start ?? input.horaInicio ?? actual.hora_inicio,
      hora_fin:
        input.hora_fin ?? input.fin ?? input.end ?? input.horaFin ?? actual.hora_fin,
      estado: input.estado ?? input.status,
      motivo: input.motivo ?? input.reason,
    }
  );

  const otros = await horarioRepository.findByCourtId(cancha.id_cancha);
  assertNoConflicts(payload, otros, id_horario);

  const actualizado = await horarioRepository.update(id_horario, payload);
  return { cancha, horario: actualizado };
};

const deleteSchedule = async (id_propietario, rawId, rawScheduleId) => {
  const cancha = await getOwnedCourt(id_propietario, rawId);
  const id_horario = parseId(rawScheduleId, "franja horaria");
  const result = await horarioRepository.deleteByIdAndCourt(id_horario, cancha.id_cancha);
  if (result.count === 0) throw new ApiError(404, "Horario no encontrado");
  return { cancha, horarios: await horarioRepository.findByCourtId(cancha.id_cancha) };
};

const parseDuration = (value) => {
  if (value === undefined || value === null || value === "") return 60;
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 15 || duration > 360) {
    throw new ApiError(400, "La duracion de los turnos debe estar entre 15 y 360 minutos");
  }
  return duration;
};

// Solo los intervalos de atencion registrados generan turnos reservables.
const getAvailability = async (rawId, query = {}) => {
  const cancha = await getCourt(rawId);
  const fechaRaw = query.fecha ?? query.date ?? todayDateOnly();
  const fechaInfo = parseDateOnly(fechaRaw);
  if (!fechaInfo) {
    throw new ApiError(400, 'La fecha debe tener el formato "YYYY-MM-DD"');
  }
  const duracion = parseDuration(query.duracion ?? query.duration);

  const [horarios, reservas] = await Promise.all([
    horarioRepository.findByCourtIdAndDay(cancha.id_cancha, fechaInfo.dia_semana),
    reservaRepository.findByCourtAndDate(cancha.id_cancha, fechaInfo.fecha),
  ]);

  const slots = [];
  for (const franja of horarios) {
    const start = timeToMinutes(franja.hora_inicio);
    const end = timeToMinutes(franja.hora_fin);
    for (let cursor = start; cursor + duracion <= end; cursor += duracion) {
      const hora_inicio = minutesToTime(cursor);
      const hora_fin = minutesToTime(cursor + duracion);
      const reservado = reservas.some((reserva) =>
        intervalsOverlap(hora_inicio, hora_fin, reserva.hora_inicio, reserva.hora_fin)
      );
      slots.push({
        hora_inicio,
        hora_fin,
        disponible: !reservado,
        motivo: reservado ? "reservado" : null,
      });
    }
  }
  slots.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const disponibles = slots.filter((slot) => slot.disponible);

  return {
    cancha,
    fecha: fechaInfo.fechaTexto,
    dia_semana: fechaInfo.dia_semana,
    dia: nombreDia(fechaInfo.dia_semana),
    duracion,
    horarios,
    atencion: horarios,
    reservas,
    slots,
    disponibles,
    disponible: disponibles.length > 0,
  };
};

module.exports = {
  DIAS_SEMANA,
  listSchedules,
  createSchedules,
  replaceSchedules,
  updateSchedule,
  deleteSchedule,
  getAvailability,
};

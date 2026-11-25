const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const cierreRepository = require("../repositories/cierre.repository");
const { parseDateOnly, todayDateOnly } = require("../utils/scheduleTime");

const parseSelection = (input = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "Los datos del cierre no son validos");
  }
  const fechaInfo = parseDateOnly(input.fecha);
  if (!fechaInfo) {
    throw new ApiError(400, 'La fecha debe tener el formato "YYYY-MM-DD"');
  }
  if (fechaInfo.fechaTexto < todayDateOnly()) {
    throw new ApiError(400, "No se puede cerrar una cancha en una fecha pasada");
  }
  if (!Array.isArray(input.id_canchas) || input.id_canchas.length === 0) {
    throw new ApiError(400, "Selecciona al menos una cancha");
  }

  const id_canchas = input.id_canchas.map((value) => Number(value));
  if (
    input.id_canchas.some((value, index) =>
      (typeof value !== "number" && typeof value !== "string") ||
      !Number.isInteger(id_canchas[index]) ||
      id_canchas[index] < 1
    )
  ) {
    throw new ApiError(400, "Los identificadores de las canchas no son validos");
  }
  if (new Set(id_canchas).size !== id_canchas.length) {
    throw new ApiError(400, "No se deben repetir canchas en la seleccion");
  }
  return { fechaInfo, id_canchas };
};

const getOwnedSelection = async (id_propietario, id_canchas, client) => {
  const canchas = await cierreRepository.findOwnedCourts(
    id_propietario,
    id_canchas,
    client
  );
  if (canchas.length !== id_canchas.length) {
    throw new ApiError(404, "Una o mas canchas no existen o no pertenecen al propietario");
  }
  return canchas;
};

const getDuplicateClosures = async (canchas, fecha, client) => {
  const cierres = await cierreRepository.findClosures(
    canchas.map((cancha) => cancha.id_cancha),
    fecha,
    client
  );
  if (cierres.length === 0) return;
  const nombres = canchas
    .filter((cancha) => cierres.some((cierre) => cierre.id_cancha === cancha.id_cancha))
    .map((cancha) => cancha.nombre);
  throw new ApiError(
    409,
    `Ya existe un cierre para ${nombres.join(", ")} en la fecha seleccionada`
  );
};

const buildPreview = (canchas, reservas) => {
  const reservasPorCancha = new Map();
  for (const reserva of reservas) {
    const actuales = reservasPorCancha.get(reserva.id_cancha) || [];
    actuales.push({
      id_reserva: reserva.id_reserva,
      hora_inicio: reserva.hora_inicio,
      hora_fin: reserva.hora_fin,
      estado: reserva.estado,
      jugador: reserva.usuario
        ? `${reserva.usuario.nombre} ${reserva.usuario.apellido}`.trim()
        : "Jugador",
    });
    reservasPorCancha.set(reserva.id_cancha, actuales);
  }
  return canchas.map((cancha) => ({
    ...cancha,
    reservas: reservasPorCancha.get(cancha.id_cancha) || [],
  }));
};

const preview = async (id_propietario, input) => {
  const { fechaInfo, id_canchas } = parseSelection(input);
  const canchas = await getOwnedSelection(id_propietario, id_canchas);
  await getDuplicateClosures(canchas, fechaInfo.fecha);
  const reservas = await cierreRepository.findAffectedReservations(
    id_canchas,
    fechaInfo.fecha
  );
  return {
    fecha: fechaInfo.fechaTexto,
    canchas: buildPreview(canchas, reservas),
    reservas_afectadas: reservas.length,
    reservas_revision: reservas.map((reserva) => reserva.id_reserva).sort((a, b) => a - b),
  };
};

const apply = async (id_propietario, input) => {
  const { fechaInfo, id_canchas } = parseSelection(input);
  if (
    !Array.isArray(input.reservas_revision) ||
    input.reservas_revision.some((id) => !Number.isInteger(id) || id < 1)
  ) {
    throw new ApiError(400, "Vuelve a revisar las reservas antes de confirmar el cierre");
  }
  const reservasRevision = [...new Set(input.reservas_revision)];
  if (reservasRevision.length !== input.reservas_revision.length) {
    throw new ApiError(400, "La revision contiene reservas duplicadas");
  }
  try {
    return await prisma.$transaction(
      async (tx) => {
        const canchas = await getOwnedSelection(id_propietario, id_canchas, tx);
        await getDuplicateClosures(canchas, fechaInfo.fecha, tx);
        const reservas = await cierreRepository.findAffectedReservations(
          id_canchas,
          fechaInfo.fecha,
          tx
        );
        const reservasActuales = reservas.map((reserva) => reserva.id_reserva).sort((a, b) => a - b);
        const reservasEsperadas = [...reservasRevision].sort((a, b) => a - b);
        if (
          reservasActuales.length !== reservasEsperadas.length ||
          reservasActuales.some((id, index) => id !== reservasEsperadas[index])
        ) {
          throw new ApiError(
            409,
            "Las reservas afectadas cambiaron desde la revisión. Vuelve a revisar el cierre"
          );
        }

        await cierreRepository.createClosures(
          id_canchas.map((id_cancha) => ({
            id_cancha,
            fecha: fechaInfo.fecha,
          })),
          tx
        );
        const canceladas = await cierreRepository.cancelActiveReservations(
          id_canchas,
          fechaInfo.fecha,
          tx
        );
        if (canceladas.count !== reservas.length) {
          throw new ApiError(
            409,
            "Las reservas cambiaron durante la operación. Vuelve a revisar el cierre"
          );
        }

        await cierreRepository.createNotifications(
          reservas.map((reserva) => ({
            id_usuario: reserva.id_usuario,
            titulo: "Reserva cancelada por cierre de cancha",
            mensaje: `Tu reserva en ${reserva.cancha.nombre} del ${fechaInfo.fechaTexto} de ${reserva.hora_inicio} a ${reserva.hora_fin} fue cancelada porque el propietario cerró la cancha.`,
          })),
          tx
        );

        return {
          fecha: fechaInfo.fechaTexto,
          canchas,
          reservas_canceladas: canceladas.count,
        };
      },
      { isolationLevel: "Serializable" }
    );
  } catch (error) {
    if (error.code === "P2034" || error.code === "P2002") {
      throw new ApiError(
        409,
        "El cierre no pudo completarse porque los datos cambiaron. Revisa la fecha y vuelve a intentarlo"
      );
    }
    throw error;
  }
};

module.exports = { preview, apply };

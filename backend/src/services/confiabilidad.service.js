const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const RESTRICCIONES = (rol, puntaje) => {
  if (rol === "ADMINISTRADOR") return { nivel: "ADMINISTRACION" };
  if (puntaje >= 80) {
    return rol === "JUGADOR"
      ? { nivel: "SIN_RESTRICCIONES", advertencia: false, puede_unirse: true, puede_reservar: true }
      : { nivel: "SIN_RESTRICCIONES", advertencia: false, puede_registrar_canchas: true, puede_publicar_disponibilidad: true, puede_administrar_existentes: true };
  }
  if (puntaje >= 60) {
    return rol === "JUGADOR"
      ? { nivel: "ADVERTENCIA", advertencia: true, puede_unirse: true, puede_reservar: true }
      : { nivel: "ADVERTENCIA", advertencia: true, puede_registrar_canchas: true, puede_publicar_disponibilidad: true, puede_administrar_existentes: true };
  }
  if (puntaje >= 40) {
    return rol === "JUGADOR"
      ? { nivel: "SIN_UNIRSE_A_PARTIDOS", puede_unirse: false, puede_reservar: true }
      : { nivel: "SIN_REGISTRAR_CANCHAS", puede_registrar_canchas: false, puede_publicar_disponibilidad: true, puede_administrar_existentes: true };
  }
  if (puntaje > 0) {
    return rol === "JUGADOR"
      ? { nivel: "SIN_PARTIDOS_NI_RESERVAS", puede_unirse: false, puede_reservar: false }
      : {
          nivel: "SIN_CANCHAS_NI_DISPONIBILIDAD",
          puede_registrar_canchas: false,
          puede_publicar_disponibilidad: false,
          puede_administrar_existentes: true,
        };
  }
  return rol === "JUGADOR"
    ? {
        nivel: "REVISION_ADMINISTRATIVA",
        puede_unirse: false,
        puede_reservar: false,
        requiere_revision_administrativa: true,
      }
    : {
        nivel: "REVISION_ADMINISTRATIVA",
        puede_registrar_canchas: false,
        puede_publicar_disponibilidad: false,
        puede_administrar_existentes: true,
        requiere_revision_administrativa: true,
      };
};

const nivelPuntaje = (puntaje) =>
  puntaje === 0 ? 0 : puntaje < 40 ? 1 : puntaje < 60 ? 40 : puntaje < 80 ? 60 : 80;

const descripcionRestriccion = (rol, puntaje) => {
  if (puntaje >= 80) return "No tienes restricciones por puntaje.";
  if (puntaje >= 60) return "Recibiste una advertencia; mantienes tus acciones.";
  if (rol === "JUGADOR" && puntaje >= 40) return "No puedes unirte a partidos; puedes seguir reservando.";
  if (rol === "JUGADOR" && puntaje > 0) return "No puedes unirte a partidos ni crear reservas.";
  if (rol === "JUGADOR") return "No puedes reservar ni unirte a partidos; solicita revisión administrativa.";
  if (puntaje >= 40) return "No puedes registrar canchas; puedes administrar las existentes.";
  if (puntaje > 0) return "No puedes registrar canchas ni publicar disponibilidad nueva.";
  return "No puedes registrar canchas ni publicar disponibilidad; solicita revisión administrativa.";
};

const getScore = async (id_usuario, client = prisma) => {
  const usuario = await client.usuario.findUnique({
    where: { id_usuario },
    select: { rol: true, puntaje_confiabilidad: true },
  });
  if (!usuario) throw new ApiError(404, "Usuario no encontrado");
  return usuario;
};

const lockScore = async (id_usuario, client) => {
  if (client !== prisma) {
    await client.$queryRaw`SELECT "id_usuario" FROM "usuarios" WHERE "id_usuario" = ${id_usuario} FOR UPDATE`;
  }
};

const assertCanJoin = async (id_usuario, client = prisma) => {
  await lockScore(id_usuario, client);
  const usuario = await getScore(id_usuario, client);
  if (usuario.puntaje_confiabilidad < 60) {
    throw new ApiError(403, "Tu puntaje de confiabilidad no permite unirte a partidos");
  }
};

const assertCanReserve = async (id_usuario, client = prisma) => {
  await lockScore(id_usuario, client);
  const usuario = await getScore(id_usuario, client);
  if (usuario.puntaje_confiabilidad < 40) {
    throw new ApiError(403, "Tu puntaje de confiabilidad no permite crear reservas");
  }
};

const assertCanRegisterCourt = async (id_usuario, client = prisma) => {
  await lockScore(id_usuario, client);
  const usuario = await getScore(id_usuario, client);
  if (usuario.puntaje_confiabilidad < 60) {
    throw new ApiError(403, "Tu puntaje de confiabilidad no permite registrar canchas");
  }
};

const assertCanPublishAvailability = async (id_usuario, client = prisma) => {
  await lockScore(id_usuario, client);
  const usuario = await getScore(id_usuario, client);
  if (usuario.puntaje_confiabilidad < 40) {
    throw new ApiError(403, "Tu puntaje de confiabilidad no permite publicar disponibilidad nueva");
  }
};

const changeScore = async (tx, {
  id_usuario,
  delta,
  tipo,
  motivo,
  id_partido = null,
  id_reporte = null,
  id_movimiento_origen = null,
  id_administrador = null,
  referencia_operacion = null,
  titulo = "Cambio en tu puntaje de confiabilidad",
  detalle,
}) => {
  await tx.$queryRaw`SELECT "id_usuario" FROM "usuarios" WHERE "id_usuario" = ${id_usuario} FOR UPDATE`;
  const usuario = await tx.usuario.findUnique({
    where: { id_usuario },
    select: { rol: true, puntaje_confiabilidad: true },
  });
  if (!usuario) throw new ApiError(404, "Usuario no encontrado");

  const anterior = usuario.puntaje_confiabilidad;
  const resultante = Math.max(0, Math.min(100, anterior + delta));
  const deltaAplicado = resultante - anterior;
  const mensaje = detalle
    ? detalle({ delta: Math.abs(deltaAplicado), puntaje: resultante })
    : `${motivo.slice(0, 300)}. Se descontaron ${Math.abs(deltaAplicado)} puntos; tu nuevo puntaje es ${resultante}.`;

  await tx.notificacion.create({
    data: { id_usuario, titulo, mensaje: mensaje.slice(0, 500) },
  });
  if (nivelPuntaje(anterior) !== nivelPuntaje(resultante)) {
    await tx.notificacion.create({
      data: {
        id_usuario,
        titulo: "Cambio en tus permisos por confiabilidad",
        mensaje: descripcionRestriccion(usuario.rol, resultante),
      },
    });
  }

  await tx.usuario.update({
    where: { id_usuario },
    data: { puntaje_confiabilidad: resultante },
  });
  return tx.movimientoConfiabilidad.create({
    data: {
      id_usuario,
      id_partido,
      id_reporte,
      id_movimiento_origen,
      id_administrador,
      tipo,
      puntos_delta: deltaAplicado,
      puntaje_anterior: anterior,
      puntaje_resultante: resultante,
      motivo,
      referencia_operacion,
    },
  });
};

const getMine = async (id_usuario) => {
  const [usuario, movimientos] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id_usuario },
      select: { rol: true, puntaje_confiabilidad: true },
    }),
    prisma.movimientoConfiabilidad.findMany({
      where: { id_usuario },
      include: {
        partido: { select: { id_partido: true, nombre: true, fecha_hora: true } },
        revisiones: { select: { id_revision: true, estado: true, decision: true, fecha_solicitud: true } },
      },
      orderBy: { fecha_creacion: "desc" },
    }),
  ]);
  if (!usuario) throw new ApiError(404, "Usuario no encontrado");
  return {
    puntaje: usuario.puntaje_confiabilidad,
    restricciones: RESTRICCIONES(usuario.rol, usuario.puntaje_confiabilidad),
    historial: movimientos,
  };
};

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, `Identificador de ${label} no válido`);
  return id;
};

const parseText = (value, label) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 500) {
    throw new ApiError(400, `${label} debe tener entre 1 y 500 caracteres`);
  }
  return value.trim();
};

const createNoShowReport = async (organizador, rawPartidoId, input = {}) => {
  const id_partido = parseId(rawPartidoId, "partido");
  const id_jugador = parseId(input.id_jugador, "jugador");
  if (id_jugador === organizador.id_usuario) {
    throw new ApiError(400, "No puedes reportarte a ti mismo");
  }
  const motivo = parseText(input.motivo, "El motivo");
  try {
    return await prisma.$transaction(async (tx) => {
      const partido = await tx.partido.findUnique({
        where: { id_partido },
        include: {
          participantes: {
            where: { id_usuario: id_jugador, estado: "ACEPTADO" },
            select: { id_usuario: true },
          },
        },
      });
      if (!partido) throw new ApiError(404, "Partido no encontrado");
      if (partido.id_organizador !== organizador.id_usuario) {
        throw new ApiError(403, "Solo el organizador puede reportar inasistencias");
      }
      if (partido.fecha_hora >= new Date() || partido.estado === "CANCELADO") {
        throw new ApiError(400, "Solo se puede reportar la inasistencia a un partido realizado");
      }
      if (partido.participantes.length === 0) {
        throw new ApiError(400, "El jugador no figura como participante aceptado");
      }
      const jugador = await tx.usuario.findFirst({
        where: { id_usuario: id_jugador, rol: "JUGADOR" },
        select: { id_usuario: true },
      });
      if (!jugador) throw new ApiError(400, "Solo se puede reportar la inasistencia de un jugador");
      const reporte = await tx.reporteInasistencia.create({
        data: { id_partido, id_organizador: organizador.id_usuario, id_jugador, motivo },
      });
      await tx.notificacion.create({
        data: {
          id_usuario: id_jugador,
          titulo: "Reporte de inasistencia recibido",
          mensaje: `El organizador reportó una inasistencia en "${partido.nombre.slice(0, 120)}". Motivo informado: ${motivo.slice(0, 180)}. Pendiente de revisión administrativa; aún no se descontaron puntos.`,
        },
      });
      return reporte;
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Ya existe un reporte para este jugador y partido");
    }
    throw error;
  }
};

const listAdminReports = () =>
  prisma.reporteInasistencia.findMany({
    include: {
      partido: { select: { id_partido: true, nombre: true, fecha_hora: true } },
      organizador: { select: { id_usuario: true, nombre: true, apellido: true } },
      jugador: { select: { id_usuario: true, nombre: true, apellido: true, puntaje_confiabilidad: true } },
    },
    orderBy: { fecha_reporte: "asc" },
  });

const decideNoShow = async (adminId, rawId, input = {}) => {
  const id_reporte = parseId(rawId, "reporte");
  if (!["VALIDADO", "RECHAZADO"].includes(input.estado)) {
    throw new ApiError(400, 'La decisión debe ser "VALIDADO" o "RECHAZADO"');
  }
  const decision = parseText(input.decision, "La decisión");
  try {
    return await prisma.$transaction(async (tx) => {
      const reporte = await tx.reporteInasistencia.findUnique({ where: { id_reporte } });
      if (!reporte) throw new ApiError(404, "Reporte no encontrado");
      if (reporte.estado !== "PENDIENTE") throw new ApiError(409, "El reporte ya fue resuelto");
      const actualizado = await tx.reporteInasistencia.update({
        where: { id_reporte },
        data: { estado: input.estado, fecha_decision: new Date(), decidido_por: adminId },
      });
      if (input.estado === "VALIDADO") {
        const motivoValidacion =
          `Inasistencia reportada: ${reporte.motivo.slice(0, 250)}. Validación administrativa: ${decision.slice(0, 150)}`;
        await changeScore(tx, {
          id_usuario: reporte.id_jugador,
          delta: -20,
          tipo: "INASISTENCIA",
          id_partido: reporte.id_partido,
          id_reporte,
          id_administrador: adminId,
          motivo: motivoValidacion,
          titulo: "Inasistencia validada",
          detalle: ({ delta, puntaje }) =>
            `Un administrador validó tu inasistencia. Motivo: ${reporte.motivo.slice(0, 180)}. Decisión: ${decision.slice(0, 100)}. Se descontaron ${delta} puntos; nuevo puntaje: ${puntaje}.`,
        });
      } else {
        await tx.notificacion.create({
          data: {
            id_usuario: reporte.id_jugador,
            titulo: "Reporte de inasistencia rechazado",
            mensaje: `El administrador rechazó el reporte. Motivo: ${decision.slice(0, 350)}. No se descontaron puntos.`,
          },
        });
      }
      return actualizado;
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error.code === "P2034" || error.code === "P2002") {
      throw new ApiError(409, "El reporte cambió durante la revisión");
    }
    throw error;
  }
};

const requestReview = async (id_usuario, rawMovementId, input = {}) => {
  const id_movimiento = parseId(rawMovementId, "movimiento");
  const motivo = parseText(input.motivo, "El motivo");
  const movimiento = await prisma.movimientoConfiabilidad.findFirst({
    where: { id_movimiento, id_usuario, puntos_delta: { lt: 0 } },
  });
  if (!movimiento) throw new ApiError(404, "Descuento no encontrado");
  try {
    return await prisma.revisionConfiabilidad.create({
      data: { id_movimiento, id_solicitante: id_usuario, motivo },
    });
  } catch (error) {
    if (error.code === "P2002") throw new ApiError(409, "Ya solicitaste una revisión para este descuento");
    throw error;
  }
};

const listAdminReviews = () =>
  prisma.revisionConfiabilidad.findMany({
    include: {
      solicitante: { select: { id_usuario: true, nombre: true, apellido: true, rol: true } },
      movimiento: true,
    },
    orderBy: { fecha_solicitud: "asc" },
  });

const decideReview = async (adminId, rawId, input = {}) => {
  const id_revision = parseId(rawId, "revisión");
  if (!["ACEPTADA", "RECHAZADA"].includes(input.estado)) {
    throw new ApiError(400, 'La decisión debe ser "ACEPTADA" o "RECHAZADA"');
  }
  const decision = parseText(input.decision, "La decisión");
  try {
    return await prisma.$transaction(async (tx) => {
      const revision = await tx.revisionConfiabilidad.findUnique({
        where: { id_revision },
        include: { movimiento: true },
      });
      if (!revision) throw new ApiError(404, "Solicitud de revisión no encontrada");
      if (revision.estado !== "PENDIENTE") throw new ApiError(409, "La solicitud ya fue resuelta");
      await tx.revisionConfiabilidad.update({
        where: { id_revision },
        data: { estado: input.estado, decision, fecha_decision: new Date(), decidido_por: adminId },
      });

      if (input.estado === "ACEPTADA") {
        if (revision.movimiento.puntos_delta >= 0) {
          throw new ApiError(400, "Solo se pueden revertir descuentos");
        }
        await changeScore(tx, {
          id_usuario: revision.id_solicitante,
          delta: -revision.movimiento.puntos_delta,
          tipo: "AJUSTE_ADMIN",
          id_movimiento_origen: revision.id_movimiento,
          id_administrador: adminId,
          motivo: `Reversión de descuento aprobada: ${decision}`.slice(0, 500),
          titulo: "Descuento revertido",
          detalle: ({ delta, puntaje }) =>
            `El administrador aceptó tu revisión. Motivo: ${decision.slice(0, 200)}. Se restituyeron ${delta} puntos; tu nuevo puntaje es ${puntaje}.`,
        });
      } else {
        await tx.notificacion.create({
          data: {
            id_usuario: revision.id_solicitante,
            titulo: "Revisión de confiabilidad resuelta",
            mensaje: `El administrador rechazó tu solicitud. Motivo: ${decision.slice(0, 400)}.`,
          },
        });
      }
      return tx.revisionConfiabilidad.findUnique({ where: { id_revision } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error.code === "P2034" || error.code === "P2002") {
      throw new ApiError(409, "La solicitud de revisión cambió durante la operación");
    }
    throw error;
  }
};

const setAdminScore = async (adminId, rawUserId, input = {}) => {
  const id_usuario = parseId(rawUserId, "usuario");
  const puntaje = Number(input.puntaje);
  if (!Number.isInteger(puntaje) || puntaje < 0 || puntaje > 100) {
    throw new ApiError(400, "El puntaje debe ser un entero entre 0 y 100");
  }
  const motivo = parseText(input.motivo, "El motivo");
  return prisma.$transaction(async (tx) => {
    const actual = await getScore(id_usuario, tx);
    const movimiento = await changeScore(tx, {
      id_usuario,
      delta: puntaje - actual.puntaje_confiabilidad,
      tipo: "AJUSTE_ADMIN",
      id_administrador: adminId,
      motivo: motivo,
      titulo: "Puntaje corregido por administración",
      detalle: ({ delta, puntaje: nuevo }) =>
        `Un administrador corrigió tu puntaje. Motivo: ${motivo.slice(0, 200)}. Variación: ${delta} puntos; nuevo puntaje: ${nuevo}.`,
    });
    return movimiento;
  }, { isolationLevel: "Serializable" });
};

module.exports = {
  RESTRICCIONES,
  getScore,
  assertCanJoin,
  assertCanReserve,
  assertCanRegisterCourt,
  assertCanPublishAvailability,
  changeScore,
  getMine,
  createNoShowReport,
  listAdminReports,
  decideNoShow,
  requestReview,
  listAdminReviews,
  decideReview,
  setAdminScore,
};

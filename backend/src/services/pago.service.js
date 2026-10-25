const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const pagoRepository = require("../repositories/pago.repository");
const reservaRepository = require("../repositories/reserva.repository");
const { client, paypal } = require("../config/paypal");
const {
  timeToMinutes,
  intervalsOverlap,
} = require("../utils/scheduleTime");

const parseId = (value, entidad = "pago") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(400, `El identificador de la ${entidad} no es valido`);
  }
  return id;
};

const assertCanAccessReservation = (usuario, reserva) => {
  if (usuario.rol === "ADMINISTRADOR") return;
  if (reserva.id_usuario === usuario.id_usuario) return;
  if (reserva.cancha?.id_propietario === usuario.id_usuario) return;
  throw new ApiError(403, "No tiene permisos para gestionar esta reserva");
};

const esPagoPaypal = (pago) => /paypal/i.test(String(pago?.metodo_pago || ""));

const esCapturaCompletada = (result = {}) => {
  if (result.status === "COMPLETED") return true;
  return (result.purchase_units || []).some((unidad) =>
    (unidad.payments?.captures || []).some((captura) => captura.status === "COMPLETED")
  );
};

// Aprueba un pago y confirma la reserva en una sola transaccion. Se usa tanto
// para la verificacion manual del propietario como para la confirmacion
// automatica al capturar un pago de PayPal.
const aprobarPagoYConfirmarReserva = async ({
  id_pago,
  id_reserva,
  verificado_por = null,
  referencia,
  comprobante_url,
}) =>
  prisma.$transaction(
    async (tx) => {
      const reserva = await tx.reserva.findUnique({ where: { id_reserva } });
      if (!reserva) throw new ApiError(404, "Reserva no encontrada");
      if (reserva.estado === "CANCELADA") {
        throw new ApiError(400, "No se puede confirmar una reserva cancelada");
      }
      if (reserva.estado === "COMPLETADA") {
        throw new ApiError(400, "No se puede confirmar una reserva completada");
      }

      const solapantes = await tx.reserva.findMany({
        where: {
          id_cancha: reserva.id_cancha,
          fecha: reserva.fecha,
          estado: { in: ["PENDIENTE", "CONFIRMADA"] },
          NOT: { id_reserva },
          hora_inicio: { lt: reserva.hora_fin },
          hora_fin: { gt: reserva.hora_inicio },
        },
      });
      if (solapantes.length > 0) {
        throw new ApiError(
          400,
          "La reserva entra en conflicto con otra reserva activa"
        );
      }

      const datosPago = {
        estado: "APROBADO",
        fecha_verificacion: new Date(),
        verificado_por,
      };
      if (referencia) datosPago.referencia = referencia;
      if (comprobante_url) datosPago.comprobante_url = comprobante_url;

      const pagoActualizado = await tx.pago.update({
        where: { id_pago },
        data: datosPago,
      });

      const reservaActualizada = await tx.reserva.update({
        where: { id_reserva },
        data: { estado: "CONFIRMADA" },
        include: {
          cancha: true,
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              apellido: true,
              correo: true,
              telefono: true,
            },
          },
          pagos: { orderBy: { fecha_pago: "desc" } },
        },
      });

      return { pago: pagoActualizado, reserva: reservaActualizada };
    },
    { isolationLevel: "Serializable" }
  );

const registerPayment = async (usuario, rawIdReserva, input = {}) => {
  const id_reserva = parseId(rawIdReserva, "reserva");
  const reserva = await reservaRepository.findById(id_reserva);
  if (!reserva) throw new ApiError(404, "Reserva no encontrada");
  assertCanAccessReservation(usuario, reserva);

  if (reserva.estado === "CANCELADA") {
    throw new ApiError(400, "No se puede registrar un pago para una reserva cancelada");
  }
  if (reserva.estado === "CONFIRMADA") {
    throw new ApiError(400, "La reserva ya se encuentra confirmada");
  }
  if (reserva.estado === "COMPLETADA") {
    throw new ApiError(400, "No se puede registrar un pago para una reserva completada");
  }

  const monto = Number(input.monto ?? input.amount ?? reserva.monto_total);
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new ApiError(400, "El monto del pago debe ser mayor a cero");
  }

  const metodo_pago = (input.metodo_pago ?? input.metodo ?? input.method ?? "PAYPAL_SIMULADO")
    .toString()
    .trim()
    .toUpperCase();
  const referencia = (input.referencia ?? input.reference ?? input.transaction_id ?? "").toString().trim() || null;
  const comprobante_url = (input.comprobante_url ?? input.comprobante ?? input.receipt_url ?? "").toString().trim() || null;

  const pago = await pagoRepository.create({
    id_reserva,
    monto: Math.round(monto * 100) / 100,
    metodo_pago,
    referencia,
    comprobante_url,
    estado: "PENDIENTE",
  });

  return { pago, reserva };
};

const listPayments = async (usuario, rawIdReserva) => {
  const id_reserva = parseId(rawIdReserva, "reserva");
  const reserva = await reservaRepository.findById(id_reserva);
  if (!reserva) throw new ApiError(404, "Reserva no encontrada");
  assertCanAccessReservation(usuario, reserva);
  const pagos = await pagoRepository.findByReservation(id_reserva);
  return { pagos, reserva };
};

const verifyPayment = async (usuario, rawIdPago, input = {}) => {
  if (usuario.rol !== "PROPIETARIO" && usuario.rol !== "ADMINISTRADOR") {
    throw new ApiError(403, "Solo el propietario o administrador puede verificar pagos");
  }

  const id_pago = parseId(rawIdPago, "pago");
  const pago = await pagoRepository.findById(id_pago);
  if (!pago) throw new ApiError(404, "Pago no encontrado");

  const reserva = pago.reserva;
  if (reserva.estado === "CANCELADA") {
    throw new ApiError(400, "No se puede verificar un pago para una reserva cancelada");
  }
  if (reserva.estado === "COMPLETADA") {
    throw new ApiError(400, "No se puede verificar un pago para una reserva completada");
  }

  // Verificar permisos si es propietario
  if (usuario.rol === "PROPIETARIO" && reserva.cancha?.id_propietario !== usuario.id_usuario) {
    throw new ApiError(403, "No tiene permisos para verificar este pago");
  }

  const accion = (input.accion ?? input.action ?? "APROBAR").toString().toUpperCase();
  if (accion !== "APROBAR" && accion !== "RECHAZAR") {
    throw new ApiError(400, "La accion debe ser APROBAR o RECHAZAR");
  }

  if (pago.estado !== "PENDIENTE") {
    throw new ApiError(400, "El pago ya fue verificado previamente");
  }

  if (accion === "RECHAZAR") {
    const pagoActualizado = await prisma.pago.update({
      where: { id_pago },
      data: {
        estado: "RECHAZADO",
        verificado_por: usuario.id_usuario,
        fecha_verificacion: new Date(),
      },
    });
    return { pago: pagoActualizado, reserva };
  }

  // APROBAR: confirmar el pago y la reserva en una sola transaccion.
  return aprobarPagoYConfirmarReserva({
    id_pago,
    id_reserva: reserva.id_reserva,
    verificado_por: usuario.id_usuario,
  });
};

const paypalSimulate = async (usuario, rawIdReserva, input = {}) => {
  const id_reserva = parseId(rawIdReserva, "reserva");
  const reserva = await reservaRepository.findById(id_reserva);
  if (!reserva) throw new ApiError(404, "Reserva no encontrada");
  assertCanAccessReservation(usuario, reserva);

  if (reserva.estado === "CANCELADA") {
    throw new ApiError(400, "No se puede simular pago para una reserva cancelada");
  }
  if (reserva.estado === "CONFIRMADA") {
    throw new ApiError(400, "La reserva ya se encuentra confirmada");
  }
  if (reserva.estado === "COMPLETADA") {
    throw new ApiError(400, "No se puede simular pago para una reserva completada");
  }

  const monto = Number(input.monto ?? reserva.monto_total);
  const referencia = input.referencia ?? `PAYPAL-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `RES-${reserva.id_reserva}`,
          description: `Reserva cancha ${reserva.cancha?.nombre || ''} ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`,
          amount: {
            currency_code: "USD",
            value: (Math.round(monto * 100) / 100).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: "Partidechi ya!",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reservations/${reserva.id_reserva}/pay?paypal=success`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reservations/${reserva.id_reserva}/pay?paypal=cancel`,
      },
    });

    const order = await client().execute(request);
    const approvalUrl = order.result.links?.find((l) => l.rel === "approve")?.href;
    const orderId = order.result.id;

    const pago = await pagoRepository.create({
      id_reserva,
      monto: Math.round(monto * 100) / 100,
      metodo_pago: "PAYPAL",
      referencia: orderId || referencia,
      comprobante_url: approvalUrl || null,
      estado: "PENDIENTE",
    });

    return { pago, reserva, amount: pago.monto, currency: "BOB", approvalUrl, orderId };
  } catch (error) {
    // Fallback: crear registro pendiente aunque no se pueda crear orden
    const pago = await pagoRepository.create({
      id_reserva,
      monto: Math.round(monto * 100) / 100,
      metodo_pago: "PAYPAL",
      referencia,
      comprobante_url: null,
      estado: "PENDIENTE",
    });
    return { pago, reserva, amount: pago.monto, currency: "BOB" };
  }
};

const paypalCapture = async (usuario, rawIdReserva, input = {}) => {
  const id_reserva = parseId(rawIdReserva, "reserva");
  const reserva = await reservaRepository.findById(id_reserva);
  if (!reserva) throw new ApiError(404, "Reserva no encontrada");
  assertCanAccessReservation(usuario, reserva);

  if (reserva.estado === "CANCELADA") {
    throw new ApiError(400, "No se puede confirmar el pago de una reserva cancelada");
  }
  if (reserva.estado === "COMPLETADA") {
    throw new ApiError(400, "No se puede confirmar el pago de una reserva completada");
  }

  const pagos = await pagoRepository.findByReservation(id_reserva);

  // Idempotencia: si la reserva ya fue confirmada no se vuelve a capturar.
  if (reserva.estado === "CONFIRMADA") {
    const pagoAprobado =
      pagos.find((pago) => pago.estado === "APROBADO") ||
      pagos.find(esPagoPaypal) ||
      null;
    return {
      pago: pagoAprobado,
      reserva,
      alreadyConfirmed: true,
      captured: false,
      warning: null,
    };
  }

  const pagosPendientesPaypal = pagos.filter(
    (pago) => pago.estado === "PENDIENTE" && esPagoPaypal(pago)
  );
  if (pagosPendientesPaypal.length === 0) {
    throw new ApiError(
      400,
      "No existe un pago de PayPal pendiente para esta reserva. Registra el pago primero."
    );
  }

  const orderIdInput = String(
    input.orderId ?? input.order_id ?? input.token ?? ""
  ).trim();
  const sandbox = (process.env.PAYPAL_MODE || "sandbox") !== "live";
  const pagoCoincidente = orderIdInput
    ? pagosPendientesPaypal.find(
        (pago) => String(pago.referencia || "") === orderIdInput
      )
    : null;

  if (orderIdInput && !pagoCoincidente && !sandbox) {
    throw new ApiError(
      400,
      "La orden de PayPal no corresponde a un pago pendiente de esta reserva"
    );
  }

  const pagoPendiente = pagoCoincidente || pagosPendientesPaypal[0];
  const orderId = orderIdInput || String(pagoPendiente.referencia || "").trim();

  let captured = false;
  let captureId = null;
  let warning = null;

  if (orderId) {
    try {
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});
      const response = await client().execute(request);
      captured = esCapturaCompletada(response.result);
      captureId =
        response.result?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
      if (!captured) {
        throw new ApiError(400, "PayPal no confirmó la captura del pago");
      }
    } catch (error) {
      // En produccion un fallo de captura impide confirmar el pago.
      if (error instanceof ApiError) throw error;
      if (!sandbox) {
        throw new ApiError(
          502,
          "No se pudo confirmar el pago con PayPal. Intenta nuevamente."
        );
      }
      // En modo sandbox se permite continuar con la simulación cuando PayPal
      // no está configurado o no está disponible, para no bloquear las pruebas.
      warning =
        "No se pudo capturar la orden en PayPal; se confirmó el pago en modo sandbox.";
      console.warn("PayPal capture fallback:", error.message);
    }
  } else if (!sandbox) {
    throw new ApiError(400, "No se recibió el identificador de la orden de PayPal");
  } else {
    warning =
      "No se recibió el identificador de la orden de PayPal; se confirmó el pago en modo sandbox.";
  }

  const resultado = await aprobarPagoYConfirmarReserva({
    id_pago: pagoPendiente.id_pago,
    id_reserva,
    verificado_por: null,
    referencia: orderId || pagoPendiente.referencia,
    comprobante_url: pagoPendiente.comprobante_url,
  });

  return {
    ...resultado,
    alreadyConfirmed: false,
    captured,
    captureId,
    warning,
  };
};

const getAmount = async (usuario, rawIdReserva) => {
  const id_reserva = parseId(rawIdReserva, "reserva");
  const reserva = await reservaRepository.findById(id_reserva);
  if (!reserva) throw new ApiError(404, "Reserva no encontrada");
  assertCanAccessReservation(usuario, reserva);
  return { reserva, amount: reserva.monto_total, currency: "BOB" };
};

module.exports = {
  registerPayment,
  listPayments,
  verifyPayment,
  paypalSimulate,
  paypalCapture,
  getAmount,
};

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

  // Verificar permisos si es propietario
  if (usuario.rol === "PROPIETARIO" && reserva.cancha?.id_propietario !== usuario.id_usuario) {
    throw new ApiError(403, "No tiene permisos para verificar este pago");
  }

  const accion = (input.accion ?? input.action ?? "APROBAR").toString().toUpperCase();
  if (accion !== "APROBAR" && accion !== "RECHAZAR") {
    throw new ApiError(400, "La accion debe ser APROBAR o RECHAZAR");
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

  // APROBAR: verificar disponibilidad nuevamente y confirmar reserva
  return prisma.$transaction(
    async (tx) => {
      // Verificar solapamiento con reservas activas (excluyendo esta reserva)
      const solapantes = await tx.reserva.findMany({
        where: {
          id_cancha: reserva.id_cancha,
          fecha: reserva.fecha,
          estado: { in: ["PENDIENTE", "CONFIRMADA"] },
          NOT: { id_reserva: reserva.id_reserva },
          hora_inicio: { lt: reserva.hora_fin },
          hora_fin: { gt: reserva.hora_inicio },
        },
      });
      if (solapantes.length > 0) {
        throw new ApiError(400, "La reserva entra en conflicto con otra reserva activa");
      }

      const pagoActualizado = await tx.pago.update({
        where: { id_pago },
        data: {
          estado: "APROBADO",
          verificado_por: usuario.id_usuario,
          fecha_verificacion: new Date(),
        },
      });

      const reservaActualizada = await tx.reserva.update({
        where: { id_reserva: reserva.id_reserva },
        data: { estado: "CONFIRMADA" },
        include: { cancha: true },
      });

      return { pago: pagoActualizado, reserva: reservaActualizada };
    },
    { isolationLevel: "Serializable" }
  );
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

    const pago = await pagoRepository.create({
      id_reserva,
      monto: Math.round(monto * 100) / 100,
      metodo_pago: "PAYPAL",
      referencia,
      comprobante_url: approvalUrl || null,
      estado: "PENDIENTE",
    });

    return { pago, reserva, amount: pago.monto, currency: "BOB", approvalUrl, orderId: order.result.id };
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
  getAmount,
};

const Module = require("node:module");
const path = require("node:path");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const resolveFromBackend = (filePath) => path.resolve(__dirname, "..", filePath);
const paths = {
  prisma: resolveFromBackend("src/config/prisma.js"),
  pagoRepository: resolveFromBackend("src/repositories/pago.repository.js"),
  reservaRepository: resolveFromBackend("src/repositories/reserva.repository.js"),
  paypalConfig: resolveFromBackend("src/config/paypal.js"),
  service: resolveFromBackend("src/services/pago.service.js"),
};

let world;

const fakePrisma = {
  $transaction: async (callback) => callback(world.tx),
  pago: {
    update: async ({ data }) => {
      world.pagoUpdate = data;
      world.pago = { ...world.pago, ...data };
      return world.pago;
    },
  },
};

const fakePagoRepository = {
  findById: async () => world.pago,
  findByReservation: async () => world.pagos,
  create: async (data) => {
    world.createdPago = data;
    return { id_pago: 21, ...data };
  },
};

const fakeReservaRepository = {
  findById: async () => world.reserva,
};

class FakeOrdersCaptureRequest {
  constructor(orderId) {
    this.orderId = orderId;
  }
  requestBody() {}
}

class FakeOrdersCreateRequest {
  prefer() {}
  requestBody() {}
}

const fakePaypal = {
  orders: {
    OrdersCaptureRequest: FakeOrdersCaptureRequest,
    OrdersCreateRequest: FakeOrdersCreateRequest,
  },
};

const fakeClient = () => ({
  execute: async (request) => {
    world.paypalRequest = request;
    if (world.paypalError) throw world.paypalError;
    return world.paypalResponse;
  },
});

const fakePaypalConfig = { client: fakeClient, paypal: fakePaypal };

const dependencies = new Map([
  [paths.prisma, fakePrisma],
  [paths.pagoRepository, fakePagoRepository],
  [paths.reservaRepository, fakeReservaRepository],
  [paths.paypalConfig, fakePaypalConfig],
]);

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent, isMain);
  if (resolved === paths.service) {
    const service = originalLoad.call(this, request, parent, isMain);
    Module._load = originalLoad;
    return service;
  }
  if (dependencies.has(resolved)) return dependencies.get(resolved);
  return originalLoad.call(this, request, parent, isMain);
};

const pagoService = require(paths.service);

const PROPIETARIO = { id_usuario: 7, rol: "PROPIETARIO" };
const JUGADOR = { id_usuario: 5, rol: "JUGADOR" };

const createWorld = (overrides = {}) => {
  const reserva = {
    id_reserva: 1,
    id_usuario: 5,
    id_cancha: 1,
    fecha: new Date("2030-01-15"),
    hora_inicio: "09:00",
    hora_fin: "10:00",
    monto_total: 100,
    estado: "PENDIENTE",
    cancha: { id_cancha: 1, id_propietario: 7, nombre: "Cancha Norte" },
  };
  const pago = {
    id_pago: 11,
    id_reserva: 1,
    monto: 100,
    metodo_pago: "PAYPAL",
    referencia: "ORDER-1",
    comprobante_url: null,
    estado: "PENDIENTE",
    reserva,
  };
  const tx = {
    reserva: {
      findUnique: async () => world.reserva,
      findMany: async () => world.solapantes,
      update: async ({ data }) => {
        world.reserva = { ...world.reserva, ...data };
        return world.reserva;
      },
    },
    pago: {
      update: async ({ data }) => {
        world.pagoUpdate = data;
        world.pago = { ...world.pago, ...data };
        return world.pago;
      },
    },
  };
  world = {
    tx,
    reserva,
    pago,
    pagos: [],
    solapantes: [],
    paypalError: null,
    paypalResponse: {
      status: "COMPLETED",
      purchase_units: [
        { payments: { captures: [{ id: "CAP-1", status: "COMPLETED" }] } },
      ],
    },
    ...overrides,
  };
  world.pago.reserva = world.reserva;
  fakePrisma.$transaction = async (callback) => callback(world.tx);
  process.env.PAYPAL_MODE = "sandbox";
  return world;
};

beforeEach(() => {
  createWorld();
});

test("solo propietario o administrador puede verificar un pago", async () => {
  await assert.rejects(
    pagoService.verifyPayment(JUGADOR, "11", { accion: "APROBAR" }),
    (error) => error.statusCode === 403
  );
});

test("no se puede verificar dos veces el mismo pago", async () => {
  createWorld();
  world.pago.estado = "APROBADO";

  await assert.rejects(
    pagoService.verifyPayment(PROPIETARIO, "11", { accion: "APROBAR" }),
    (error) => error.statusCode === 400 && /ya fue verificado/i.test(error.message)
  );
});

test("rechazar un pago no confirma la reserva", async () => {
  createWorld();

  const result = await pagoService.verifyPayment(PROPIETARIO, "11", {
    accion: "RECHAZAR",
  });

  assert.equal(result.pago.estado, "RECHAZADO");
  assert.equal(world.pagoUpdate.verificado_por, 7);
  assert.equal(world.reserva.estado, "PENDIENTE");
});

test("aprobar un pago confirma la reserva en la misma transaccion", async () => {
  createWorld();

  const result = await pagoService.verifyPayment(PROPIETARIO, "11", {
    accion: "APROBAR",
  });

  assert.equal(world.pagoUpdate.estado, "APROBADO");
  assert.equal(result.reserva.estado, "CONFIRMADA");
  assert.equal(world.pagoUpdate.verificado_por, 7);
  assert.equal(world.pagoUpdate.fecha_verificacion instanceof Date, true);
});

test("un propietario no puede verificar pagos de canchas ajenas", async () => {
  createWorld();
  world.reserva.cancha.id_propietario = 99;

  await assert.rejects(
    pagoService.verifyPayment(PROPIETARIO, "11", { accion: "APROBAR" }),
    (error) => error.statusCode === 403
  );
});

test("no se verifica un pago de una reserva cancelada", async () => {
  createWorld();
  world.reserva.estado = "CANCELADA";

  await assert.rejects(
    pagoService.verifyPayment(PROPIETARIO, "11", { accion: "APROBAR" }),
    (error) => error.statusCode === 400 && /cancelada/i.test(error.message)
  );
});

test("la captura de PayPal es idempotente si la reserva ya esta confirmada", async () => {
  createWorld();
  world.reserva.estado = "CONFIRMADA";
  world.pagos = [{ id_pago: 11, estado: "APROBADO", metodo_pago: "PAYPAL" }];

  const result = await pagoService.paypalCapture(JUGADOR, "1", {
    orderId: "ORDER-1",
  });

  assert.equal(result.alreadyConfirmed, true);
  assert.equal(result.captured, false);
  assert.equal(world.paypalRequest, undefined);
});

test("no captura si no existe un pago PayPal pendiente", async () => {
  createWorld();
  world.pagos = [{ id_pago: 11, estado: "PENDIENTE", metodo_pago: "EFECTIVO" }];

  await assert.rejects(
    pagoService.paypalCapture(JUGADOR, "1", { orderId: "ORDER-1" }),
    (error) => error.statusCode === 400 && /No existe un pago de PayPal/i.test(error.message)
  );
});

test("en sandbox confirma la reserva aunque PayPal no responda", async () => {
  createWorld();
  world.pagos = [
    {
      id_pago: 11,
      estado: "PENDIENTE",
      metodo_pago: "PAYPAL",
      referencia: "ORDER-1",
      comprobante_url: null,
    },
  ];
  world.paypalError = new Error("timeout de red");

  const result = await pagoService.paypalCapture(JUGADOR, "1", {
    orderId: "ORDER-1",
  });

  assert.equal(result.captured, false);
  assert.match(result.warning, /sandbox/i);
  assert.equal(result.pago.estado, "APROBADO");
  assert.equal(result.reserva.estado, "CONFIRMADA");
});

test("en modo live un fallo de PayPal impide confirmar el pago", async () => {
  createWorld();
  process.env.PAYPAL_MODE = "live";
  world.pagos = [
    {
      id_pago: 11,
      estado: "PENDIENTE",
      metodo_pago: "PAYPAL",
      referencia: "ORDER-1",
      comprobante_url: null,
    },
  ];
  world.paypalError = new Error("timeout de red");

  await assert.rejects(
    pagoService.paypalCapture(JUGADOR, "1", { orderId: "ORDER-1" }),
    (error) => error.statusCode === 502
  );
});

test("no registra pagos para una reserva ya confirmada", async () => {
  createWorld();
  world.reserva.estado = "CONFIRMADA";

  await assert.rejects(
    pagoService.registerPayment(JUGADOR, "1", { monto: 100 }),
    (error) => error.statusCode === 400 && /ya se encuentra confirmada/i.test(error.message)
  );
});

test("registra un pago manual pendiente con monto redondeado", async () => {
  createWorld();

  const result = await pagoService.registerPayment(JUGADOR, "1", {
    monto: 99.999,
    metodo_pago: " transferencia ",
    referencia: " REF-1 ",
  });

  assert.equal(result.pago.estado, "PENDIENTE");
  assert.equal(world.createdPago.monto, 100);
  assert.equal(world.createdPago.metodo_pago, "TRANSFERENCIA");
  assert.equal(world.createdPago.referencia, "REF-1");
});

test("devuelve el importe a pagar de la reserva", async () => {
  createWorld();

  const result = await pagoService.getAmount(JUGADOR, "1");

  assert.equal(result.amount, 100);
  assert.equal(result.currency, "BOB");
});

test("si PayPal no crea la orden, deja un pago pendiente como respaldo", async () => {
  createWorld();
  world.paypalError = new Error("PayPal no disponible");

  const result = await pagoService.paypalSimulate(JUGADOR, "1", { monto: 100 });

  assert.equal(result.pago.estado, "PENDIENTE");
  assert.equal(result.pago.metodo_pago, "PAYPAL");
  assert.equal(result.approvalUrl, undefined);
  assert.equal(world.createdPago.referencia.startsWith("PAYPAL-"), true);
});

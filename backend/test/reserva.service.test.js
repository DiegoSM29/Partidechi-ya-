const Module = require("node:module");
const path = require("node:path");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const resolveFromBackend = (filePath) => path.resolve(__dirname, "..", filePath);
const paths = {
  prisma: resolveFromBackend("src/config/prisma.js"),
  canchaRepository: resolveFromBackend("src/repositories/cancha.repository.js"),
  horarioRepository: resolveFromBackend("src/repositories/horario.repository.js"),
  reservaRepository: resolveFromBackend("src/repositories/reserva.repository.js"),
  cierreRepository: resolveFromBackend("src/repositories/cierre.repository.js"),
  confiabilidadService: resolveFromBackend("src/services/confiabilidad.service.js"),
  service: resolveFromBackend("src/services/reserva.service.js"),
};

let world;

const fakePrisma = {
  $transaction: async (callback) => callback(world.tx),
  pago: {
    findFirst: async (query) => {
      world.pagoQuery = query;
      return world.pagoAprobado;
    },
  },
  reserva: {
    findMany: async (query) => {
      world.confirmOverlapQuery = query;
      return world.confirmOverlap;
    },
  },
};

const fakeCanchaRepository = {
  findById: async () => world.cancha,
};

const fakeHorarioRepository = {
  findByCourtIdAndDay: async () => world.horarios,
};

const fakeReservaRepository = {
  findOverlapping: async () => world.overlapping,
  create: async (data) => {
    world.created = data;
    return { id_reserva: 99, ...data };
  },
  findMany: async (where) => {
    world.listWhere = where;
    return world.reservas;
  },
  findById: async () => world.reserva,
  updateEstado: async (_id, estado) => {
    world.updatedEstado = estado;
    if (world.reserva) world.reserva.estado = estado;
    return { ...world.reserva, estado };
  },
};

const fakeCierreRepository = {
  isClosed: async () => world.cierre,
};

const fakeConfiabilidadService = {
  assertCanReserve: async () => {
    if (world.assertCanReserveError) throw world.assertCanReserveError;
  },
  getScore: async () => world.score,
};

const dependencies = new Map([
  [paths.prisma, fakePrisma],
  [paths.canchaRepository, fakeCanchaRepository],
  [paths.horarioRepository, fakeHorarioRepository],
  [paths.reservaRepository, fakeReservaRepository],
  [paths.cierreRepository, fakeCierreRepository],
  [paths.confiabilidadService, fakeConfiabilidadService],
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

const reservaService = require(paths.service);

const FECHA = "2030-01-15";
const JUGADOR = { id_usuario: 5, rol: "JUGADOR" };
const PROPIETARIO = { id_usuario: 7, rol: "PROPIETARIO" };

const createWorld = (overrides = {}) => {
  const tx = {
    $queryRaw: async () => [],
    reserva: {
      findMany: async (query) => {
        world.activeOverlapQuery = query;
        return world.activeOverlap;
      },
    },
  };
  fakePrisma.$transaction = async (callback) => callback(world.tx);
  fakeConfiabilidadService.assertCanReserve = async () => {};
  world = {
    tx,
    cancha: { id_cancha: 1, id_propietario: 7, precio_hora: 50 },
    horarios: [{ id_horario: 1, dia_semana: 2, hora_inicio: "08:00", hora_fin: "12:00" }],
    cierre: null,
    overlapping: [],
    activeOverlap: [],
    confirmOverlap: [],
    pagoAprobado: null,
    reserva: null,
    reservas: [],
    score: { puntaje_confiabilidad: 100 },
    ...overrides,
  };
  return world;
};

beforeEach(() => {
  createWorld();
});

test("rechaza una reserva cuando la cancha esta cerrada", async () => {
  createWorld({ cierre: { id_cierre: 1 } });

  await assert.rejects(
    reservaService.create(JUGADOR, {
      id_cancha: 1,
      fecha: FECHA,
      hora_inicio: "09:00",
      hora_fin: "10:00",
    }),
    (error) => error.statusCode === 400 && /cerrada/i.test(error.message)
  );
});

test("rechaza una reserva cuando no hay horario para ese dia", async () => {
  createWorld({ horarios: [] });

  await assert.rejects(
    reservaService.create(JUGADOR, {
      id_cancha: 1,
      fecha: FECHA,
      hora_inicio: "09:00",
      hora_fin: "10:00",
    }),
    (error) => error.statusCode === 400 && /horario de atencion/i.test(error.message)
  );
});

test("rechaza una reserva fuera del horario de atencion", async () => {
  createWorld();

  await assert.rejects(
    reservaService.create(JUGADOR, {
      id_cancha: 1,
      fecha: FECHA,
      hora_inicio: "13:00",
      hora_fin: "14:00",
    }),
    (error) => error.statusCode === 400 && /fuera del horario/i.test(error.message)
  );
});

test("rechaza una reserva que se solapa con otra activa", async () => {
  createWorld({
    overlapping: [{ id_reserva: 8, hora_inicio: "09:30", hora_fin: "10:30" }],
  });

  await assert.rejects(
    reservaService.create(JUGADOR, {
      id_cancha: 1,
      fecha: FECHA,
      hora_inicio: "09:00",
      hora_fin: "10:00",
    }),
    (error) => error.statusCode === 400 && /ya tiene una reserva/i.test(error.message)
  );
});

test("crea una reserva pendiente y calcula el monto por las horas solicitadas", async () => {
  createWorld();

  const result = await reservaService.create(JUGADOR, {
    id_cancha: 1,
    fecha: FECHA,
    hora_inicio: "09:00",
    hora_fin: "11:30",
  });

  assert.equal(result.reserva.estado, "PENDIENTE");
  assert.equal(result.reserva.id_usuario, 5);
  assert.equal(result.reserva.id_cancha, 1);
  assert.equal(result.reserva.monto_total, 125);
  assert.equal(world.created.estado, "PENDIENTE");
  assert.equal(world.activeOverlapQuery.where.estado.in.includes("CONFIRMADA"), true);
});

test("rechaza una reserva con fecha pasada sin consultar la base", async () => {
  await assert.rejects(
    reservaService.create(JUGADOR, {
      id_cancha: 1,
      fecha: "2020-01-01",
      hora_inicio: "09:00",
      hora_fin: "10:00",
    }),
    (error) => error.statusCode === 400 && /fecha pasada/i.test(error.message)
  );
});

test("un propietario solo lista reservas de sus propias canchas", async () => {
  createWorld({ reservas: [{ id_reserva: 1 }] });

  await reservaService.list(PROPIETARIO, { id_cancha: "99", estado: "confirmada" });

  assert.equal(world.listWhere.id_cancha, 99);
  assert.deepEqual(world.listWhere.cancha, { id_propietario: 7 });
  assert.equal(world.listWhere.estado, "CONFIRMADA");
  assert.equal(world.listWhere.id_usuario, undefined);
});

test("rechaza filtros de estado invalidos", async () => {
  await assert.rejects(
    reservaService.list(JUGADOR, { estado: "DESCONOCIDO" }),
    (error) => error.statusCode === 400 && /estado de reserva/i.test(error.message)
  );
});

test("impide consultar una reserva ajena", async () => {
  createWorld({
    reserva: {
      id_reserva: 3,
      id_usuario: 2,
      cancha: { id_propietario: 9 },
    },
  });

  await assert.rejects(
    reservaService.getById(JUGADOR, "3"),
    (error) => error.statusCode === 403
  );
});

test("permite consultar una reserva ajena a un administrador", async () => {
  createWorld({
    reserva: {
      id_reserva: 3,
      id_usuario: 2,
      cancha: { id_propietario: 9 },
    },
  });

  const result = await reservaService.getById(
    { id_usuario: 1, rol: "ADMINISTRADOR" },
    "3"
  );

  assert.equal(result.id_reserva, 3);
});

test("no permite cancelar una reserva ya cancelada", async () => {
  createWorld({
    reserva: {
      id_reserva: 3,
      id_usuario: 5,
      estado: "CANCELADA",
      cancha: { id_propietario: 7 },
    },
  });

  await assert.rejects(
    reservaService.cancel(JUGADOR, "3"),
    (error) => error.statusCode === 400 && /ya fue cancelada/i.test(error.message)
  );
});

test("no permite confirmar una reserva sin pago aprobado", async () => {
  createWorld({
    reserva: {
      id_reserva: 3,
      id_usuario: 5,
      estado: "PENDIENTE",
      cancha: { id_propietario: 7 },
    },
    pagoAprobado: null,
  });

  await assert.rejects(
    reservaService.confirm(PROPIETARIO, "3"),
    (error) => error.statusCode === 400 && /verificar el pago/i.test(error.message)
  );
});

test("confirma una reserva con pago aprobado y sin solapes", async () => {
  createWorld({
    reserva: {
      id_reserva: 3,
      id_usuario: 5,
      id_cancha: 1,
      fecha: new Date(FECHA),
      hora_inicio: "09:00",
      hora_fin: "10:00",
      estado: "PENDIENTE",
      cancha: { id_propietario: 7 },
    },
    pagoAprobado: { id_pago: 11, estado: "APROBADO" },
    confirmOverlap: [],
  });

  const result = await reservaService.confirm(PROPIETARIO, "3");

  assert.equal(world.updatedEstado, "CONFIRMADA");
  assert.equal(result.estado, "CONFIRMADA");
  assert.equal(world.confirmOverlapQuery.where.estado, "CONFIRMADA");
  assert.equal(world.confirmOverlapQuery.where.NOT.id_reserva, 3);
});

test("un jugador no puede confirmar una reserva", async () => {
  createWorld({
    reserva: {
      id_reserva: 3,
      id_usuario: 5,
      estado: "PENDIENTE",
      cancha: { id_propietario: 7 },
    },
  });

  await assert.rejects(
    reservaService.confirm(JUGADOR, "3"),
    (error) => error.statusCode === 403
  );
});

test("convierte el conflicto de concurrencia P2034 en un 400 reintentable", async () => {
  createWorld();
  fakePrisma.$transaction = async () => {
    const error = new Error("conflicto serializable");
    error.code = "P2034";
    throw error;
  };

  await assert.rejects(
    reservaService.create(JUGADOR, {
      id_cancha: 1,
      fecha: FECHA,
      hora_inicio: "09:00",
      hora_fin: "10:00",
    }),
    (error) => error.statusCode === 400 && /acaba de recibir otra reserva/i.test(error.message)
  );
});

test("si el puntaje no permite reservar devuelve 403", async () => {
  createWorld({ score: { puntaje_confiabilidad: 30 } });
  fakeConfiabilidadService.assertCanReserve = async () => {
    const error = new Error("Tu puntaje de confiabilidad no permite crear reservas");
    error.statusCode = 403;
    throw error;
  };

  await assert.rejects(
    reservaService.create(JUGADOR, {
      id_cancha: 1,
      fecha: FECHA,
      hora_inicio: "09:00",
      hora_fin: "10:00",
    }),
    (error) => error.statusCode === 403
  );
});

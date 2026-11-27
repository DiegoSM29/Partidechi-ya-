const Module = require("node:module");
const path = require("node:path");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const resolveFromBackend = (filePath) => path.resolve(__dirname, "..", filePath);
const paths = {
  prisma: resolveFromBackend("src/config/prisma.js"),
  cierreRepository: resolveFromBackend("src/repositories/cierre.repository.js"),
  horarioRepository: resolveFromBackend("src/repositories/horario.repository.js"),
  confiabilidadService: resolveFromBackend("src/services/confiabilidad.service.js"),
  service: resolveFromBackend("src/services/cierre.service.js"),
};

let world;

const fakePrisma = {
  $transaction: async (callback) => callback(world.tx),
};

const fakeCierreRepository = {
  findOwnedCourts: async () => world.canchas,
  findOwnedCourt: async () => world.cancha,
  findClosures: async () => world.cierres,
  findAffectedReservations: async () => world.reservas,
  createClosures: async (data) => {
    world.createdClosures = data;
    return { count: data.length };
  },
  cancelActiveReservations: async () => ({
    count: world.canceladasCount ?? world.reservas.length,
  }),
  cancelAffectedMatches: async () => ({
    count: world.partidosCanceladosCount ?? world.reservas.length,
  }),
  findAcceptedParticipantsForMatches: async () => world.participantes,
  createNotifications: async (data) => {
    world.notifications.push(...data);
    return { count: data.length };
  },
  isClosed: async () => world.cierre,
  deleteClosure: async () => world.deleteResult,
};

const fakeHorarioRepository = {
  findByCourtIdAndDay: async () => world.horarios,
};

const fakeConfiabilidadService = {
  getScore: async () => world.score,
  changeScore: async (_tx, args) => {
    world.movimientos.push(args);
    return { puntos_delta: args.delta };
  },
};

const dependencies = new Map([
  [paths.prisma, fakePrisma],
  [paths.cierreRepository, fakeCierreRepository],
  [paths.horarioRepository, fakeHorarioRepository],
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

const cierreService = require(paths.service);

const FECHA = "2030-01-15";
const PROPIETARIO = 7;

const createReserva = (id, partidoEstado = "PUBLICADO") => ({
  id_reserva: id,
  id_usuario: 20 + id,
  id_cancha: 1,
  hora_inicio: `${String(8 + id).padStart(2, "0")}:00`,
  hora_fin: `${String(9 + id).padStart(2, "0")}:00`,
  estado: "CONFIRMADA",
  cancha: { nombre: "Cancha Norte" },
  usuario: { nombre: "Jugador", apellido: String(id) },
  partido: partidoEstado
    ? { id_partido: 100 + id, nombre: `Partido ${id}`, estado: partidoEstado }
    : null,
});

const createWorld = (overrides = {}) => {
  const tx = { $queryRaw: async () => [] };
  world = {
    tx,
    canchas: [{ id_cancha: 1, nombre: "Cancha Norte" }],
    cancha: { id_cancha: 1, nombre: "Cancha Norte" },
    horarios: [{ id_horario: 1, dia_semana: 2, hora_inicio: "08:00", hora_fin: "22:00" }],
    cierres: [],
    reservas: [],
    participantes: [],
    score: { puntaje_confiabilidad: 100 },
    cierre: null,
    deleteResult: { count: 1 },
    canceladasCount: undefined,
    partidosCanceladosCount: undefined,
    createdClosures: [],
    notifications: [],
    movimientos: [],
    ...overrides,
  };
  fakePrisma.$transaction = async (callback) => callback(world.tx);
  return world;
};

beforeEach(() => {
  createWorld();
});

test("rechaza cerrar una fecha pasada", async () => {
  await assert.rejects(
    cierreService.preview(PROPIETARIO, {
      fecha: "2020-01-01",
      id_canchas: [1],
    }),
    (error) => error.statusCode === 400 && /fecha pasada/i.test(error.message)
  );
});

test("rechaza un cierre sin canchas seleccionadas", async () => {
  await assert.rejects(
    cierreService.preview(PROPIETARIO, { fecha: FECHA, id_canchas: [] }),
    (error) => error.statusCode === 400 && /al menos una cancha/i.test(error.message)
  );
});

test("rechaza canchas repetidas en la seleccion", async () => {
  await assert.rejects(
    cierreService.preview(PROPIETARIO, { fecha: FECHA, id_canchas: [1, 1] }),
    (error) => error.statusCode === 400 && /repetir canchas/i.test(error.message)
  );
});

test("rechaza canchas que no pertenecen al propietario", async () => {
  createWorld({ canchas: [] });

  await assert.rejects(
    cierreService.preview(PROPIETARIO, { fecha: FECHA, id_canchas: [1] }),
    (error) => error.statusCode === 404
  );
});

test("rechaza cerrar un dia sin horario configurado", async () => {
  createWorld({ horarios: [] });

  await assert.rejects(
    cierreService.preview(PROPIETARIO, { fecha: FECHA, id_canchas: [1] }),
    (error) => error.statusCode === 400 && /horario de funcionamiento/i.test(error.message)
  );
});

test("rechaza un cierre duplicado para la misma cancha y fecha", async () => {
  createWorld({ cierres: [{ id_cancha: 1 }] });

  await assert.rejects(
    cierreService.preview(PROPIETARIO, { fecha: FECHA, id_canchas: [1] }),
    (error) => error.statusCode === 409 && /Ya existe un cierre/i.test(error.message)
  );
});

test("la vista previa resume reservas y partidos afectados", async () => {
  createWorld({
    reservas: [createReserva(1), createReserva(2), createReserva(3)],
  });

  const result = await cierreService.preview(PROPIETARIO, {
    fecha: FECHA,
    id_canchas: [1],
  });

  assert.equal(result.fecha, FECHA);
  assert.equal(result.reservas_afectadas, 3);
  assert.equal(result.partidos_afectados, 3);
  assert.deepEqual(result.reservas_revision, [1, 2, 3]);
  assert.equal(result.canchas[0].reservas.length, 3);
  assert.equal(result.descuento_confiabilidad > 0, true);
});

test.todo("la vista previa deberia limitar el descuento a 30 puntos, igual que apply");

test("rechaza el cierre si las reservas cambiaron desde la revision", async () => {
  createWorld({
    reservas: [createReserva(1), createReserva(2)],
  });

  await assert.rejects(
    cierreService.apply(PROPIETARIO, {
      fecha: FECHA,
      id_canchas: [1],
      reservas_revision: [1],
    }),
    (error) => error.statusCode === 409 && /cambiaron desde la revisión/i.test(error.message)
  );
});

test("aplica el cierre, cancela reservas y partidos y descuenta como maximo 30 puntos", async () => {
  createWorld({
    reservas: [createReserva(1), createReserva(2), createReserva(3)],
    participantes: [{ id_usuario: 50, partido: { nombre: "Partido 1" } }],
  });

  const result = await cierreService.apply(PROPIETARIO, {
    fecha: FECHA,
    id_canchas: [1],
    reservas_revision: [1, 2, 3],
  });

  assert.equal(result.reservas_canceladas, 3);
  assert.equal(result.partidos_afectados, 3);
  assert.equal(result.descuento_confiabilidad, 30);
  assert.equal(world.createdClosures.length, 1);
  assert.equal(world.movimientos.length, 2);
  assert.deepEqual(
    world.movimientos.map((movimiento) => movimiento.delta),
    [-15, -15]
  );
  assert.equal(world.notifications.length, 4);
});

test("rechaza el cierre si las reservas canceladas no coinciden", async () => {
  createWorld({
    reservas: [createReserva(1), createReserva(2)],
    canceladasCount: 1,
  });

  await assert.rejects(
    cierreService.apply(PROPIETARIO, {
      fecha: FECHA,
      id_canchas: [1],
      reservas_revision: [1, 2],
    }),
    (error) => error.statusCode === 409 && /cambiaron durante la operación/i.test(error.message)
  );
});

test("no reabre una cancha sin cierre registrado", async () => {
  createWorld({ cierre: null });

  await assert.rejects(
    cierreService.reopen(PROPIETARIO, "1", FECHA),
    (error) => error.statusCode === 404 && /No existe un cierre/i.test(error.message)
  );
});

test("detecta un cierre que cambio durante la reapertura", async () => {
  createWorld({ cierre: { id_cierre: 1 }, deleteResult: { count: 0 } });

  await assert.rejects(
    cierreService.reopen(PROPIETARIO, "1", FECHA),
    (error) => error.statusCode === 409
  );
});

test("reabre una cancha eliminando solo su cierre", async () => {
  createWorld({ cierre: { id_cierre: 1 }, deleteResult: { count: 1 } });

  const result = await cierreService.reopen(PROPIETARIO, "1", FECHA);

  assert.equal(result.fecha, FECHA);
  assert.equal(result.cancha.id_cancha, 1);
});

test("rechaza consultar cierres con una fecha invalida", async () => {
  await assert.rejects(
    cierreService.listByDate(PROPIETARIO, "15-01-2030"),
    (error) => error.statusCode === 400 && /YYYY-MM-DD/.test(error.message)
  );
});

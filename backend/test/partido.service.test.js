const Module = require("node:module");
const path = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const resolveFromBackend = (filePath) => path.resolve(__dirname, "..", filePath);
const paths = {
  prisma: resolveFromBackend("src/config/prisma.js"),
  partidoRepository: resolveFromBackend("src/repositories/partido.repository.js"),
  participanteRepository: resolveFromBackend("src/repositories/participante.repository.js"),
  reservaRepository: resolveFromBackend("src/repositories/reserva.repository.js"),
  service: resolveFromBackend("src/services/partido.service.js"),
};

let world;

const fakePrisma = {
  $transaction: async (callback) => callback(world.tx),
};

const fakePartidoRepository = {
  lockForUpdate: async () => [],
  findById: async () => world.partido,
  update: async (_id, data) => Object.assign(world.partido, data),
};

const fakeParticipanteRepository = {
  findByPartidoAndUsuario: async (_idPartido, idUsuario) =>
    world.participantes.find((participante) => participante.id_usuario === idUsuario) || null,
  update: async (id, data) => {
    const participante = world.participantes.find((item) => item.id_participante === id);
    Object.assign(participante, data);
    return participante;
  },
};

const dependencies = new Map([
  [paths.prisma, fakePrisma],
  [paths.partidoRepository, fakePartidoRepository],
  [paths.participanteRepository, fakeParticipanteRepository],
  [paths.reservaRepository, {}],
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

const partidoService = require(paths.service);

const createWorld = (participants, score = 100) => {
  const movements = [];
  const notifications = [];
  const usuario = { rol: "JUGADOR", puntaje_confiabilidad: score };
  const tx = {
    $queryRaw: async () => [],
    usuario: {
      findUnique: async () => usuario,
      update: async ({ data }) => Object.assign(usuario, data),
    },
    notificacion: {
      create: async ({ data }) => notifications.push(data),
      createMany: async ({ data }) => notifications.push(...data),
    },
    movimientoConfiabilidad: {
      create: async ({ data }) => {
        movements.push(data);
        return data;
      },
    },
  };
  world = {
    tx,
    usuario,
    movimientos: movements,
    notificaciones: notifications,
    participantes: participants,
    partido: {
      id_partido: 41,
      id_organizador: 1,
      nombre: "Partido de prueba",
      estado: "PUBLICADO",
      fecha_hora: new Date(Date.now() + 48 * 60 * 60 * 1000),
      participantes: participants,
    },
  };
  return world;
};

test("abandonar un partido resta cinco puntos y registra el movimiento", async () => {
  const state = createWorld([
    { id_participante: 1, id_usuario: 1, estado: "ACEPTADO" },
    { id_participante: 2, id_usuario: 2, estado: "ACEPTADO" },
  ]);

  const result = await partidoService.leave({ id_usuario: 2 }, "41");

  assert.equal(state.usuario.puntaje_confiabilidad, 95);
  assert.equal(state.participantes[1].estado, "ABANDONADO");
  assert.equal(state.movimientos.length, 1);
  assert.equal(state.movimientos[0].tipo, "ABANDONO_PARTIDO");
  assert.equal(state.movimientos[0].puntos_delta, -5);
  assert.match(result.message, /Se descontaron 5 puntos/);
});

test("cancelar un partido con participantes resta diez puntos y los notifica", async () => {
  const state = createWorld([
    { id_participante: 1, id_usuario: 1, estado: "ACEPTADO" },
    { id_participante: 2, id_usuario: 2, estado: "ACEPTADO" },
    { id_participante: 3, id_usuario: 3, estado: "ACEPTADO" },
  ]);

  const result = await partidoService.remove({ id_usuario: 1 }, "41");

  assert.equal(state.usuario.puntaje_confiabilidad, 90);
  assert.equal(state.partido.estado, "CANCELADO");
  assert.equal(state.movimientos.length, 1);
  assert.equal(state.movimientos[0].tipo, "CANCELACION_PARTIDO");
  assert.equal(state.movimientos[0].puntos_delta, -10);
  assert.deepEqual(
    state.notificaciones.map(({ id_usuario }) => id_usuario).sort(),
    [1, 2, 3]
  );
  assert.equal(result.participantes_notificados, 2);
});

test("cancelar un partido sin otros participantes no resta puntos", async () => {
  const state = createWorld([
    { id_participante: 1, id_usuario: 1, estado: "ACEPTADO" },
  ]);

  await partidoService.remove({ id_usuario: 1 }, "41");

  assert.equal(state.usuario.puntaje_confiabilidad, 100);
  assert.equal(state.movimientos.length, 0);
  assert.equal(state.partido.estado, "CANCELADO");
});

test("un abandono repetido no vuelve a descontar puntos", async () => {
  const state = createWorld([
    { id_participante: 1, id_usuario: 2, estado: "ACEPTADO" },
  ]);

  await partidoService.leave({ id_usuario: 2 }, "41");
  await assert.rejects(
    partidoService.leave({ id_usuario: 2 }, "41"),
    { statusCode: 400 }
  );

  assert.equal(state.usuario.puntaje_confiabilidad, 95);
  assert.equal(state.movimientos.length, 1);
});

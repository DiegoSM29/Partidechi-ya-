const Module = require("node:module");
const path = require("node:path");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const resolveFromBackend = (filePath) => path.resolve(__dirname, "..", filePath);
const paths = {
  prisma: resolveFromBackend("src/config/prisma.js"),
  service: resolveFromBackend("src/services/confiabilidad.service.js"),
};

let world;

const fakePrisma = {
  $transaction: async (callback) => callback(world.tx),
  usuario: {
    findUnique: async () => world.usuario,
  },
  movimientoConfiabilidad: {
    findFirst: async () => world.movimientoExistente,
  },
  revisionConfiabilidad: {
    create: async ({ data }) => {
      if (world.revisionDuplicada) {
        const error = new Error("unique constraint");
        error.code = "P2002";
        throw error;
      }
      world.revisionCreada = data;
      return { id_revision: 1, ...data };
    },
  },
};

const dependencies = new Map([[paths.prisma, fakePrisma]]);

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

const confiabilidadService = require(paths.service);

const createWorld = (overrides = {}) => {
  const tx = {
    $queryRaw: async () => [],
    usuario: {
      findUnique: async () => world.usuario,
      update: async ({ data }) => {
        world.usuario = { ...world.usuario, ...data };
        return world.usuario;
      },
    },
    notificacion: {
      create: async ({ data }) => {
        world.notificaciones.push(data);
        return data;
      },
    },
    movimientoConfiabilidad: {
      create: async ({ data }) => {
        world.movimientoCreado = data;
        return data;
      },
    },
  };
  world = {
    tx,
    usuario: { rol: "JUGADOR", puntaje_confiabilidad: 100 },
    notificaciones: [],
    movimientoCreado: null,
    movimientoExistente: null,
    revisionCreada: null,
    revisionDuplicada: false,
    ...overrides,
  };
  fakePrisma.$transaction = async (callback) => callback(world.tx);
  return world;
};

beforeEach(() => {
  createWorld();
});

test("un jugador con 80 o mas no tiene restricciones", () => {
  assert.deepEqual(confiabilidadService.RESTRICCIONES("JUGADOR", 80), {
    nivel: "SIN_RESTRICCIONES",
    advertencia: false,
    puede_unirse: true,
    puede_reservar: true,
  });
});

test("un jugador entre 60 y 79 recibe advertencia sin perder acciones", () => {
  const restricciones = confiabilidadService.RESTRICCIONES("JUGADOR", 60);
  assert.equal(restricciones.nivel, "ADVERTENCIA");
  assert.equal(restricciones.advertencia, true);
  assert.equal(restricciones.puede_unirse, true);
  assert.equal(restricciones.puede_reservar, true);
});

test("un jugador entre 40 y 59 no puede unirse a partidos pero si reservar", () => {
  const restricciones = confiabilidadService.RESTRICCIONES("JUGADOR", 40);
  assert.equal(restricciones.nivel, "SIN_UNIRSE_A_PARTIDOS");
  assert.equal(restricciones.puede_unirse, false);
  assert.equal(restricciones.puede_reservar, true);
});

test("un jugador entre 1 y 39 no puede unirse ni reservar", () => {
  const restricciones = confiabilidadService.RESTRICCIONES("JUGADOR", 1);
  assert.equal(restricciones.nivel, "SIN_PARTIDOS_NI_RESERVAS");
  assert.equal(restricciones.puede_unirse, false);
  assert.equal(restricciones.puede_reservar, false);
});

test("un jugador con 0 requiere revision administrativa", () => {
  const restricciones = confiabilidadService.RESTRICCIONES("JUGADOR", 0);
  assert.equal(restricciones.nivel, "REVISION_ADMINISTRATIVA");
  assert.equal(restricciones.requiere_revision_administrativa, true);
});

test("un propietario entre 40 y 59 no puede registrar canchas pero si publicar disponibilidad", () => {
  const restricciones = confiabilidadService.RESTRICCIONES("PROPIETARIO", 40);
  assert.equal(restricciones.nivel, "SIN_REGISTRAR_CANCHAS");
  assert.equal(restricciones.puede_registrar_canchas, false);
  assert.equal(restricciones.puede_publicar_disponibilidad, true);
  assert.equal(restricciones.puede_administrar_existentes, true);
});

test("un propietario entre 1 y 39 no puede publicar disponibilidad nueva", () => {
  const restricciones = confiabilidadService.RESTRICCIONES("PROPIETARIO", 1);
  assert.equal(restricciones.nivel, "SIN_CANCHAS_NI_DISPONIBILIDAD");
  assert.equal(restricciones.puede_registrar_canchas, false);
  assert.equal(restricciones.puede_publicar_disponibilidad, false);
  assert.equal(restricciones.puede_administrar_existentes, true);
});

test("un administrador no tiene restricciones por puntaje", () => {
  assert.deepEqual(confiabilidadService.RESTRICCIONES("ADMINISTRADOR", 0), {
    nivel: "ADMINISTRACION",
  });
});

test("el puntaje nunca supera 100 y registra solo el delta aplicado", async () => {
  createWorld({ usuario: { rol: "JUGADOR", puntaje_confiabilidad: 95 } });

  await confiabilidadService.changeScore(world.tx, {
    id_usuario: 5,
    delta: 10,
    tipo: "AJUSTE_ADMIN",
    motivo: "Ajuste de prueba",
  });

  assert.equal(world.usuario.puntaje_confiabilidad, 100);
  assert.equal(world.movimientoCreado.puntos_delta, 5);
  assert.equal(world.movimientoCreado.puntaje_anterior, 95);
  assert.equal(world.movimientoCreado.puntaje_resultante, 100);
  assert.equal(world.notificaciones.length, 1);
});

test("el puntaje nunca baja de 0 y avisa el cambio de permisos", async () => {
  createWorld({ usuario: { rol: "JUGADOR", puntaje_confiabilidad: 20 } });

  await confiabilidadService.changeScore(world.tx, {
    id_usuario: 5,
    delta: -30,
    tipo: "INASISTENCIA",
    motivo: "Inasistencia validada",
  });

  assert.equal(world.usuario.puntaje_confiabilidad, 0);
  assert.equal(world.movimientoCreado.puntos_delta, -20);
  assert.equal(world.movimientoCreado.puntaje_resultante, 0);
  assert.equal(world.notificaciones.length, 2);
  assert.match(world.notificaciones[1].titulo, /permisos/i);
});

test("el mensaje de la notificacion se limita a 500 caracteres", async () => {
  createWorld();

  await confiabilidadService.changeScore(world.tx, {
    id_usuario: 5,
    delta: -5,
    tipo: "ABANDONO_PARTIDO",
    motivo: "motivo",
    detalle: () => "x".repeat(900),
  });

  assert.equal(world.notificaciones[0].mensaje.length, 500);
});

test("no permite unirse a partidos con puntaje menor a 60", async () => {
  createWorld({ usuario: { rol: "JUGADOR", puntaje_confiabilidad: 59 } });

  await assert.rejects(
    confiabilidadService.assertCanJoin(5, world.tx),
    (error) => error.statusCode === 403
  );

  world.usuario.puntaje_confiabilidad = 60;
  await assert.doesNotReject(confiabilidadService.assertCanJoin(5, world.tx));
});

test("no permite reservar con puntaje menor a 40", async () => {
  createWorld({ usuario: { rol: "JUGADOR", puntaje_confiabilidad: 39 } });

  await assert.rejects(
    confiabilidadService.assertCanReserve(5, world.tx),
    (error) => error.statusCode === 403
  );

  world.usuario.puntaje_confiabilidad = 40;
  await assert.doesNotReject(confiabilidadService.assertCanReserve(5, world.tx));
});

test("no permite registrar canchas con puntaje menor a 60", async () => {
  createWorld({ usuario: { rol: "PROPIETARIO", puntaje_confiabilidad: 59 } });

  await assert.rejects(
    confiabilidadService.assertCanRegisterCourt(5, world.tx),
    (error) => error.statusCode === 403
  );
});

test("no permite publicar disponibilidad con puntaje menor a 40", async () => {
  createWorld({ usuario: { rol: "PROPIETARIO", puntaje_confiabilidad: 39 } });

  await assert.rejects(
    confiabilidadService.assertCanPublishAvailability(5, world.tx),
    (error) => error.statusCode === 403
  );
});

test("valida el rango y el motivo al corregir el puntaje desde administracion", async () => {
  await assert.rejects(
    confiabilidadService.setAdminScore(1, "5", { puntaje: 101, motivo: "correccion" }),
    (error) => error.statusCode === 400
  );

  await assert.rejects(
    confiabilidadService.setAdminScore(1, "5", { puntaje: 70, motivo: "" }),
    (error) => error.statusCode === 400
  );
});

test("un administrador corrige el puntaje y queda registrado el movimiento", async () => {
  createWorld({ usuario: { rol: "JUGADOR", puntaje_confiabilidad: 50 } });

  const movimiento = await confiabilidadService.setAdminScore(1, "5", {
    puntaje: 70,
    motivo: "Correccion manual",
  });

  assert.equal(world.usuario.puntaje_confiabilidad, 70);
  assert.equal(movimiento.puntos_delta, 20);
  assert.equal(movimiento.tipo, "AJUSTE_ADMIN");
  assert.equal(movimiento.id_administrador, 1);
});

test("no permite pedir revision de un descuento inexistente", async () => {
  createWorld({ movimientoExistente: null });

  await assert.rejects(
    confiabilidadService.requestReview(5, "3", { motivo: "No estoy de acuerdo" }),
    (error) => error.statusCode === 404
  );
});

test("no permite pedir dos veces revision del mismo descuento", async () => {
  createWorld({
    movimientoExistente: { id_movimiento: 3, id_usuario: 5, puntos_delta: -5 },
    revisionDuplicada: true,
  });

  await assert.rejects(
    confiabilidadService.requestReview(5, "3", { motivo: "No estoy de acuerdo" }),
    (error) => error.statusCode === 409
  );
});

test("registra una solicitud de revision para un descuento propio", async () => {
  createWorld({
    movimientoExistente: { id_movimiento: 3, id_usuario: 5, puntos_delta: -5 },
  });

  const revision = await confiabilidadService.requestReview(5, "3", {
    motivo: "No estoy de acuerdo",
  });

  assert.equal(revision.id_movimiento, 3);
  assert.equal(revision.id_solicitante, 5);
  assert.equal(world.revisionCreada.motivo, "No estoy de acuerdo");
});

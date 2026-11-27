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
  service: resolveFromBackend("src/services/horario.service.js"),
};

let world;

const fakePrisma = {
  $transaction: async (callback) => callback(world.tx),
};

const fakeCanchaRepository = {
  findById: async () => world.cancha,
  findByOwnerAndId: async () => world.cancha,
};

const fakeHorarioRepository = {
  findByCourtId: async () => world.horarios,
  findByCourtIdAndDay: async (_id, dia) =>
    world.horarios.filter((horario) => horario.dia_semana === dia),
  findByIdAndCourt: async () => world.horario,
  create: async (data) => {
    const creado = { id_horario: world.horarios.length + 1, ...data };
    world.created.push(creado);
    return creado;
  },
  createMany: async (data) => {
    world.createdMany = data;
    return { count: data.length };
  },
  update: async (_id, data) => {
    world.horario = { ...world.horario, ...data };
    return world.horario;
  },
  deleteByCourt: async () => {
    world.deletedByCourt = true;
    return { count: world.horarios.length };
  },
  deleteByIdAndCourt: async () => world.deleteResult,
};

const fakeReservaRepository = {
  findByCourtAndDate: async () => world.reservas,
  findByCourtAndDateRange: async () => world.reservasRango,
};

const fakeCierreRepository = {
  isClosed: async () => world.cierre,
  findClosureDatesForCourt: async () => world.cierres,
};

const fakeConfiabilidadService = {
  assertCanPublishAvailability: async () => {
    world.assertPublishCount += 1;
    if (world.assertPublishError) throw world.assertPublishError;
  },
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

const horarioService = require(paths.service);

const FECHA = "2030-01-15";
const DIA = new Date(Date.UTC(2030, 0, 15)).getUTCDay();

const createWorld = (overrides = {}) => {
  const tx = { $queryRaw: async () => [] };
  world = {
    tx,
    cancha: { id_cancha: 1, id_propietario: 7, nombre: "Cancha Norte" },
    horarios: [],
    horario: null,
    reservas: [],
    reservasRango: [],
    cierres: [],
    cierre: null,
    created: [],
    createdMany: null,
    deletedByCourt: false,
    deleteResult: { count: 1 },
    assertPublishCount: 0,
    assertPublishError: null,
    ...overrides,
  };
  fakePrisma.$transaction = async (callback) => callback(world.tx);
  return world;
};

beforeEach(() => {
  createWorld();
});

test("la disponibilidad solo genera turnos dentro del horario y descuenta reservas", async () => {
  createWorld({
    horarios: [
      { id_horario: 1, dia_semana: DIA, hora_inicio: "08:00", hora_fin: "12:00" },
    ],
    reservas: [{ hora_inicio: "09:00", hora_fin: "10:00" }],
  });

  const result = await horarioService.getAvailability("1", {
    fecha: FECHA,
    duracion: "60",
  });

  assert.equal(result.slots.length, 4);
  assert.equal(result.disponibles.length, 3);
  const turnoReservado = result.slots.find(
    (slot) => slot.hora_inicio === "09:00"
  );
  assert.equal(turnoReservado.disponible, false);
  assert.equal(turnoReservado.motivo, "reservado");
  assert.equal(
    result.slots.find((slot) => slot.hora_inicio === "08:00").disponible,
    true
  );
});

test("una cancha cerrada no ofrece ningun turno disponible", async () => {
  createWorld({
    horarios: [
      { id_horario: 1, dia_semana: DIA, hora_inicio: "08:00", hora_fin: "10:00" },
    ],
    cierre: { id_cierre: 1 },
  });

  const result = await horarioService.getAvailability("1", {
    fecha: FECHA,
    duracion: "60",
  });

  assert.equal(result.cerrada, true);
  assert.equal(result.disponible, false);
  assert.equal(result.disponibles.length, 0);
  assert.equal(result.slots.every((slot) => slot.motivo === "cancha_cerrada"), true);
});

test("rechaza fechas y duraciones invalidas en la disponibilidad", async () => {
  await assert.rejects(
    horarioService.getAvailability("1", { fecha: "15-01-2030" }),
    (error) => error.statusCode === 400 && /YYYY-MM-DD/.test(error.message)
  );

  await assert.rejects(
    horarioService.getAvailability("1", { fecha: FECHA, duracion: "10" }),
    (error) => error.statusCode === 400 && /entre 15 y 360/.test(error.message)
  );

  await assert.rejects(
    horarioService.getAvailability("1", { fecha: FECHA, duracion: "361" }),
    (error) => error.statusCode === 400
  );
});

test("el calendario mensual marca dias cerrados, sin horario y disponibles", async () => {
  const diaDos = new Date(Date.UTC(2030, 0, 2)).getUTCDay();
  createWorld({
    horarios: [
      { id_horario: 1, dia_semana: diaDos, hora_inicio: "08:00", hora_fin: "10:00" },
    ],
    cierres: [{ fecha: new Date(Date.UTC(2030, 0, 5)) }],
  });

  const result = await horarioService.getMonthlyAvailability("1", {
    mes: "2030-01",
    duracion: "60",
  });

  assert.equal(result.dias.length, 31);
  assert.equal(result.dias.find((dia) => dia.fecha === "2030-01-05").estado, "CERRADA");
  assert.equal(result.dias.find((dia) => dia.fecha === "2030-01-01").estado, "SIN_HORARIO");
  const diaDisponible = result.dias.find((dia) => dia.fecha === "2030-01-02");
  assert.equal(diaDisponible.estado, "DISPONIBLE");
  assert.equal(diaDisponible.turnos_totales, 2);
});

test("rechaza un mes con formato invalido", async () => {
  await assert.rejects(
    horarioService.getMonthlyAvailability("1", { mes: "2030-13" }),
    (error) => error.statusCode === 400 && /YYYY-MM/.test(error.message)
  );
});

test("rechaza franjas que se superponen dentro de la misma solicitud", async () => {
  await assert.rejects(
    horarioService.createSchedules(7, "1", {
      horarios: [
        { dia_semana: 1, hora_inicio: "08:00", hora_fin: "12:00" },
        { dia_semana: 1, hora_inicio: "11:00", hora_fin: "13:00" },
      ],
    }),
    (error) => error.statusCode === 400 && /se superpone/i.test(error.message)
  );
});

test("rechaza una franja que se superpone con una ya registrada", async () => {
  createWorld({
    horarios: [
      { id_horario: 1, dia_semana: 1, hora_inicio: "08:00", hora_fin: "12:00" },
    ],
  });

  await assert.rejects(
    horarioService.createSchedules(7, "1", {
      horarios: [{ dia_semana: 1, hora_inicio: "10:00", hora_fin: "11:00" }],
    }),
    (error) => error.statusCode === 400 && /se superpone con otro existente/i.test(error.message)
  );
});

test("solo acepta estados DISPONIBLE al registrar horarios", async () => {
  await assert.rejects(
    horarioService.createSchedules(7, "1", {
      dia_semana: 1,
      hora_inicio: "08:00",
      hora_fin: "10:00",
      estado: "BLOQUEADO",
    }),
    (error) => error.statusCode === 400 && /Solo se pueden registrar horarios/i.test(error.message)
  );
});

test("los horarios de funcionamiento no admiten motivos", async () => {
  await assert.rejects(
    horarioService.createSchedules(7, "1", {
      dia_semana: 1,
      hora_inicio: "08:00",
      hora_fin: "10:00",
      motivo: "mantenimiento",
    }),
    (error) => error.statusCode === 400 && /no admiten motivos/i.test(error.message)
  );
});

test("rechaza horas con formato invalido", async () => {
  await assert.rejects(
    horarioService.createSchedules(7, "1", {
      dia_semana: 1,
      hora_inicio: "25:00",
      hora_fin: "26:00",
    }),
    (error) => error.statusCode === 400 && /HH:mm/.test(error.message)
  );
});

test("reemplaza el horario semanal completo", async () => {
  const result = await horarioService.replaceSchedules(7, "1", [
    { dia_semana: 1, hora_inicio: "08:00", hora_fin: "10:00" },
    { dia_semana: 2, hora_inicio: "08:00", hora_fin: "10:00" },
  ]);

  assert.equal(world.deletedByCourt, true);
  assert.equal(world.createdMany.length, 2);
  assert.equal(result.horarios.length, 0);
});

test("editar una franja hacia adentro no exige permiso de publicar disponibilidad", async () => {
  createWorld({
    horario: { id_horario: 1, dia_semana: 1, hora_inicio: "08:00", hora_fin: "12:00" },
    horarios: [
      { id_horario: 1, dia_semana: 1, hora_inicio: "08:00", hora_fin: "12:00" },
    ],
  });

  const result = await horarioService.updateSchedule(7, "1", "1", {
    hora_fin: "11:00",
  });

  assert.equal(result.horario.hora_fin, "11:00");
  assert.equal(world.assertPublishCount, 0);
});

test("ampliar una franja exige permiso de publicar disponibilidad", async () => {
  createWorld({
    horario: { id_horario: 1, dia_semana: 1, hora_inicio: "08:00", hora_fin: "12:00" },
    horarios: [
      { id_horario: 1, dia_semana: 1, hora_inicio: "08:00", hora_fin: "12:00" },
    ],
  });

  await horarioService.updateSchedule(7, "1", "1", { hora_fin: "13:00" });

  assert.equal(world.assertPublishCount > 0, true);
});

test("no elimina una franja que no existe", async () => {
  createWorld({ deleteResult: { count: 0 } });

  await assert.rejects(
    horarioService.deleteSchedule(7, "1", "9"),
    (error) => error.statusCode === 404
  );
});

test("elimina una franja y devuelve el horario restante", async () => {
  createWorld({ deleteResult: { count: 1 } });

  const result = await horarioService.deleteSchedule(7, "1", "1");

  assert.equal(result.cancha.id_cancha, 1);
  assert.deepEqual(result.horarios, []);
});

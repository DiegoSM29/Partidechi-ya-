// Seed de datos para las pruebas de carga de Partidechi ya!.
//
// Crea un mundo reproducible sobre la base LOCAL:
//   - 1 propietario y 1000 jugadores con tokens JWT ya firmados
//   - 20 canchas con horario todos los dias de 08:00 a 23:00
//   - 1000 reservas historicas (para lecturas)
//   - 100 partidos publicos (para lecturas y para unirse)
//   - 2 notificaciones por jugador
//
// Uso (desde la raiz del repo, con DATABASE_URL apuntando a la BD local):
//   node tests/load/seed.js
//
// No imprime credenciales. Los tokens quedan en tests/load/k6/data/ y esa
// carpeta esta ignorada por git.

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");

const backendRequire = createRequire(
  path.join(__dirname, "..", "..", "backend", "package.json")
);
const dotenv = backendRequire("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "..", "backend", ".env") });

const { PrismaClient } = backendRequire("@prisma/client");
const bcrypt = backendRequire("bcryptjs");
const jwt = backendRequire("jsonwebtoken");

const prisma = new PrismaClient();

const SUFFIX = "@loadtest.partidechi.local";
const OWNER_EMAIL = `owner${SUFFIX}`;
const PLAYER_COUNT = Number(process.env.LOAD_PLAYERS || 1000);
const COURT_COUNT = Number(process.env.LOAD_COURTS || 20);
const MATCH_COUNT = Number(process.env.LOAD_MATCHES || 100);
const PASSWORD = "LoadTest123!";
const DATA_DIR = path.join(__dirname, "k6", "data");

const pad = (value, size) => String(value).padStart(size, "0");

const addDays = (baseIso, days) => {
  const date = new Date(`${baseIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const hourLabel = (hour) => `${pad(hour, 2)}:00`;

const dateLabel = (date) => date.toISOString().slice(0, 10);

const buildSchedules = () =>
  Array.from({ length: 7 }, (_, dia) => ({
    dia_semana: dia,
    hora_inicio: "08:00",
    hora_fin: "23:00",
  }));

const cleanup = async () => {
  const userFilter = { correo: { endsWith: SUFFIX } };
  const ownedCourt = { cancha: { propietario: userFilter } };

  // El orden respeta las llaves foraneas (Restrict) del esquema.
  await prisma.revisionConfiabilidad.deleteMany({
    where: { solicitante: userFilter },
  });
  await prisma.movimientoConfiabilidad.deleteMany({
    where: { usuario: userFilter },
  });
  await prisma.reporteInasistencia.deleteMany({
    where: { OR: [{ organizador: userFilter }, { jugador: userFilter }] },
  });
  await prisma.participante.deleteMany({ where: { usuario: userFilter } });
  await prisma.partido.deleteMany({ where: { organizador: userFilter } });
  await prisma.pago.deleteMany({
    where: { reserva: { usuario: userFilter } },
  });
  await prisma.reserva.deleteMany({ where: { usuario: userFilter } });
  await prisma.notificacion.deleteMany({ where: { usuario: userFilter } });
  await prisma.cierreCancha.deleteMany({ where: ownedCourt });
  await prisma.horario.deleteMany({ where: ownedCourt });
  await prisma.cancha.deleteMany({ where: { propietario: userFilter } });
  await prisma.usuario.deleteMany({ where: userFilter });
};

const createUsers = async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const owner = await prisma.usuario.create({
    data: {
      nombre: "Propietario",
      apellido: "Carga",
      correo: OWNER_EMAIL,
      password_hash: passwordHash,
      rol: "PROPIETARIO",
      telefono: "70000000",
    },
  });

  const players = Array.from({ length: PLAYER_COUNT }, (_, index) => ({
    nombre: "Jugador",
    apellido: `Carga ${pad(index + 1, 4)}`,
    correo: `player${pad(index + 1, 4)}${SUFFIX}`,
    password_hash: passwordHash,
    rol: "JUGADOR",
    telefono: `7${pad(index, 7)}`,
  }));

  await prisma.usuario.createMany({ data: players });

  const created = await prisma.usuario.findMany({
    where: { correo: { endsWith: SUFFIX }, rol: "JUGADOR" },
    orderBy: { correo: "asc" },
    select: { id_usuario: true, correo: true, rol: true },
  });

  return { owner, players: created };
};

const createCourts = async (owner) => {
  const sports = ["futbol 5", "futbol 8", "wally", "padel"];
  const courts = [];

  for (let index = 0; index < COURT_COUNT; index += 1) {
    const court = await prisma.cancha.create({
      data: {
        id_propietario: owner.id_usuario,
        nombre: `Cancha Carga ${pad(index + 1, 2)}`,
        ubicacion: `Cochabamba, zona de prueba ${pad(index + 1, 2)}`,
        latitud: -17.3895 + index * 0.001,
        longitud: -66.1568 + index * 0.001,
        deporte: sports[index % sports.length],
        precio_hora: 40 + index * 5,
        imagenes: [],
        horarios: { create: buildSchedules() },
      },
    });
    courts.push(court);
  }

  return courts;
};

const seedReadReservations = async (players, courts) => {
  const rows = players.map((player, index) => {
    const court = courts[index % courts.length];
    const fecha = addDays("2031-06-01", Math.floor(index / courts.length));
    return {
      id_usuario: player.id_usuario,
      id_cancha: court.id_cancha,
      fecha,
      hora_inicio: hourLabel(8),
      hora_fin: hourLabel(9),
      monto_total: court.precio_hora,
      estado: "CONFIRMADA",
    };
  });

  await prisma.reserva.createMany({ data: rows });
};

const seedMatches = async (players, courts) => {
  const total = Math.min(MATCH_COUNT, players.length);
  const matches = [];

  for (let index = 0; index < total; index += 1) {
    const player = players[index];
    const court = courts[index % courts.length];
    const fecha = addDays("2031-01-05", Math.floor(index / courts.length));
    const hora = hourLabel(8 + (index % 10));

    const reserva = await prisma.reserva.create({
      data: {
        id_usuario: player.id_usuario,
        id_cancha: court.id_cancha,
        fecha,
        hora_inicio: hora,
        hora_fin: hourLabel(8 + (index % 10) + 1),
        monto_total: court.precio_hora,
        estado: "CONFIRMADA",
      },
    });

    const partido = await prisma.partido.create({
      data: {
        id_organizador: player.id_usuario,
        id_reserva: reserva.id_reserva,
        nombre: `Partido de carga ${pad(index + 1, 3)}`,
        deporte: court.deporte,
        fecha_hora: new Date(`${dateLabel(fecha)}T${hora}:00`),
        jugadores_maximos: 20,
        descripcion: "Partido generado por el seed de pruebas de carga.",
        estado: "PUBLICADO",
        participantes: {
          create: {
            id_usuario: player.id_usuario,
            estado: "ACEPTADO",
          },
        },
      },
    });

    matches.push(partido.id_partido);
  }

  return matches;
};

const seedNotifications = async (players) => {
  const rows = players.flatMap((player, index) => [
    {
      id_usuario: player.id_usuario,
      titulo: "Reserva confirmada",
      mensaje: `Tu reserva de prueba ${pad(index + 1, 4)} quedo confirmada.`,
      leida: false,
    },
    {
      id_usuario: player.id_usuario,
      titulo: "Recordatorio de partido",
      mensaje: "Recuerda llegar 15 minutos antes a tu partido.",
      leida: index % 3 === 0,
    },
  ]);

  await prisma.notificacion.createMany({ data: rows });
};

const signTokens = (players) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "Falta JWT_SECRET. Ejecuta el seed con las variables de backend/.env cargadas."
    );
  }

  return players.map((player) => ({
    id: player.id_usuario,
    token: jwt.sign(
      {
        sub: player.id_usuario,
        correo: player.correo,
        rol: player.rol,
        jti: crypto.randomUUID(),
      },
      secret,
      { expiresIn: "7d" }
    ),
  }));
};

const writeData = (courts, matches, tokens) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DATA_DIR, "tokens.json"),
    JSON.stringify(tokens, null, 2)
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "courts.json"),
    JSON.stringify(courts.map((court) => court.id_cancha), null, 2)
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "matches.json"),
    JSON.stringify(matches, null, 2)
  );
};

const main = async () => {
  const startedAt = Date.now();

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Falta DATABASE_URL. Exportala apuntando a la base local antes de ejecutar el seed."
    );
  }

  console.log("Limpiando datos de carga anteriores...");
  await cleanup();

  console.log("Creando usuarios...");
  const { owner, players } = await createUsers();

  console.log("Creando canchas y horarios...");
  const courts = await createCourts(owner);

  console.log("Creando reservas de lectura...");
  await seedReadReservations(players, courts);

  console.log("Creando partidos publicos...");
  const matches = await seedMatches(players, courts);

  console.log("Creando notificaciones...");
  await seedNotifications(players);

  console.log("Firmando tokens JWT...");
  const tokens = signTokens(players);
  writeData(courts, matches, tokens);

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("");
  console.log("Seed listo en " + seconds + "s");
  console.log(`  propietario: 1 (${OWNER_EMAIL})`);
  console.log(`  jugadores:   ${players.length}`);
  console.log(`  canchas:     ${courts.length}`);
  console.log(`  partidos:    ${matches.length}`);
  console.log(`  reservas:    ${players.length + matches.length}`);
  console.log(`  datos k6:    ${DATA_DIR}`);
  console.log("");
  console.log("Los tokens caducan en 7 dias. Vuelve a ejecutar el seed si expiran.");
};

main()
  .catch((error) => {
    console.error("El seed fallo:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

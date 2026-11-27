// Mezcla de trabajo realista para Partidechi ya!:
//   ~85% lecturas (canchas, disponibilidad, partidos, reservas, notificaciones)
//   ~15% escrituras (crear reserva, unirse a un partido)
//
// Los datos los genera tests/load/seed.js en ./data/*.json.
// Cada VU usa su propio jugador y una franja distinta por iteracion para que
// las escrituras no choquen entre si; los conflictos que igual ocurran se
// consideran respuestas esperadas (400/409) y no inflan http_req_failed.

import http from "k6/http";
import { sleep } from "k6";
import { SharedArray } from "k6/data";
import {
  BASE_URL,
  FRONTEND_URL,
  SLEEP_MIN,
  SLEEP_MAX,
} from "./config.js";

http.setResponseCallback(
  http.expectedStatuses({ min: 200, max: 299 }, 400, 403, 404, 409)
);

const players = new SharedArray("players", () =>
  JSON.parse(open("./data/tokens.json"))
);
const courtIds = new SharedArray("courts", () =>
  JSON.parse(open("./data/courts.json"))
);
const matchIds = new SharedArray("matches", () =>
  JSON.parse(open("./data/matches.json"))
);

const pad = (value) => String(value).padStart(2, "0");
const hourLabel = (hour) => `${pad(hour)}:00`;

const addDays = (baseIso, days) => {
  const date = new Date(`${baseIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const pick = (array) => array[Math.floor(Math.random() * array.length)];

const playerForVu = () => players[(__VU - 1) % players.length];

const requestTags = (name) => ({ tags: { name } });

const getCourts = () =>
  http.get(`${BASE_URL}/courts`, requestTags("GET /courts"));

const getCourt = () => {
  const id = pick(courtIds);
  return http.get(`${BASE_URL}/courts/${id}`, requestTags("GET /courts/:id"));
};

const getAvailability = () => {
  const id = pick(courtIds);
  return http.get(
    `${BASE_URL}/courts/${id}/availability?fecha=2031-07-15&duracion=60`,
    requestTags("GET /courts/:id/availability")
  );
};

const getMatches = () => {
  const player = playerForVu();
  return http.get(`${BASE_URL}/matches`, {
    ...requestTags("GET /matches"),
    headers: { Authorization: `Bearer ${player.token}` },
  });
};

const getReservations = () => {
  const player = playerForVu();
  return http.get(`${BASE_URL}/reservations`, {
    ...requestTags("GET /reservations"),
    headers: { Authorization: `Bearer ${player.token}` },
  });
};

const getNotifications = () => {
  const player = playerForVu();
  return http.get(`${BASE_URL}/notifications`, {
    ...requestTags("GET /notifications"),
    headers: { Authorization: `Bearer ${player.token}` },
  });
};

const getFrontend = () => {
  if (!FRONTEND_URL) return getCourts();
  return http.get(`${FRONTEND_URL}/`, requestTags("GET / (frontend)"));
};

const createReservation = () => {
  const player = playerForVu();
  const court = courtIds[(__VU + __ITER) % courtIds.length];
  const dayOffset = (__VU * 7 + __ITER) % 365;
  const hour = 8 + ((__VU + __ITER) % 15);
  const payload = JSON.stringify({
    id_cancha: court,
    fecha: addDays("2032-01-01", dayOffset),
    hora_inicio: hourLabel(hour),
    hora_fin: hourLabel(hour + 1),
  });

  return http.post(`${BASE_URL}/reservations`, payload, {
    ...requestTags("POST /reservations"),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${player.token}`,
    },
  });
};

const joinMatch = () => {
  const player = playerForVu();
  const matchId = pick(matchIds);

  return http.post(`${BASE_URL}/matches/${matchId}/join`, null, {
    ...requestTags("POST /matches/:id/join"),
    headers: { Authorization: `Bearer ${player.token}` },
  });
};

export const runIteration = () => {
  const roll = Math.random() * 100;

  if (roll < 5) getFrontend();
  else if (roll < 25) getCourts();
  else if (roll < 35) getCourt();
  else if (roll < 50) getAvailability();
  else if (roll < 62) getMatches();
  else if (roll < 77) getReservations();
  else if (roll < 85) getNotifications();
  else if (roll < 97) createReservation();
  else joinMatch();

  sleep(SLEEP_MIN + Math.random() * (SLEEP_MAX - SLEEP_MIN));
};

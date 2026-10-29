// Utilidades para horarios: horas "HH:mm", dias de la semana y fechas "YYYY-MM-DD".
// Se usan cadenas normalizadas para que las comparaciones y el orden lexicografico
// coincidan con el orden cronologico.

const TIME_ZONE = "America/La_Paz";

const DIAS_SEMANA = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

const TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value) => String(value).padStart(2, "0");

// Devuelve "HH:mm" o null si la hora no es valida.
const normalizeTime = (value) => {
  if (typeof value !== "string") return null;
  const match = TIME_REGEX.exec(value.trim());
  if (!match) return null;
  return `${pad(Number(match[1]))}:${match[2]}`;
};

// Convierte "HH:mm" a minutos desde la medianoche.
const timeToMinutes = (value) => {
  const normalized = normalizeTime(value);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
};

// Formatea minutos desde la medianoche como "HH:mm".
const minutesToTime = (minutes) => {
  const safe = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
};

// Dos intervalos [inicioA, finA) y [inicioB, finB) se superponen si comparten
// al menos un minuto. Los extremos que solo se tocan no se consideran choque.
const intervalsOverlap = (inicioA, finA, inicioB, finB) =>
  timeToMinutes(inicioA) < timeToMinutes(finB) &&
  timeToMinutes(inicioB) < timeToMinutes(finA);

// Verifica que [inicio, fin] quede cubierto por la union de las franjas dadas.
const isIntervalCovered = (inicio, fin, franjas) => {
  const start = timeToMinutes(inicio);
  const end = timeToMinutes(fin);
  if (start === null || end === null || start >= end) return false;

  const ordenadas = franjas
    .map((franja) => ({
      start: timeToMinutes(franja.hora_inicio),
      end: timeToMinutes(franja.hora_fin),
    }))
    .filter((franja) => franja.start !== null && franja.end !== null)
    .sort((a, b) => a.start - b.start);

  let cursor = start;
  for (const franja of ordenadas) {
    if (franja.end <= cursor) continue;
    if (franja.start > cursor) break;
    cursor = Math.max(cursor, franja.end);
    if (cursor >= end) return true;
  }
  return cursor >= end;
};

// Acepta 0..6, "0".."6" o el nombre del dia (con o sin tildes).
// Se usa 0 = domingo, igual que Date#getDay().
const parseDiaSemana = (value) => {
  if (typeof value === "number" && Number.isInteger(value)) {
    if (value === 7) return 0; // alias ISO: 7 = domingo
    return value >= 0 && value <= 6 ? value : null;
  }
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "7") return 0; // alias ISO: 7 = domingo
    if (/^[0-6]$/.test(raw)) return Number(raw);
    const normalizado = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const index = DIAS_SEMANA.indexOf(normalizado);
    if (index !== -1) return index;
  }
  return null;
};

const nombreDia = (dia) => DIAS_SEMANA[dia] || null;

// Parsea "YYYY-MM-DD" como fecha UTC (sin corrimientos por zona horaria).
const parseDateOnly = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const fecha = new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
    return buildDateInfo(fecha);
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  // Acepta "YYYY-MM-DD" y tambien marcas ISO que comienzan con esa fecha.
  const candidate = raw.length > 10 ? raw.slice(0, 10) : raw;
  const match = DATE_REGEX.exec(candidate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const fecha = new Date(Date.UTC(year, month - 1, day));
  if (
    fecha.getUTCFullYear() !== year ||
    fecha.getUTCMonth() !== month - 1 ||
    fecha.getUTCDate() !== day
  ) {
    return null;
  }
  return buildDateInfo(fecha);
};

const buildDateInfo = (fecha) => ({
  fecha,
  fechaTexto: `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(
    fecha.getUTCDate()
  )}`,
  dia_semana: fecha.getUTCDay(),
});

// Fecha actual en el huso horario de Bolivia, en formato "YYYY-MM-DD".
const todayDateOnly = () => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valores = Object.fromEntries(
    partes.filter((parte) => parte.type !== "literal").map((parte) => [parte.type, parte.value])
  );
  return `${valores.year}-${valores.month}-${valores.day}`;
};

module.exports = {
  DIAS_SEMANA,
  TIME_ZONE,
  normalizeTime,
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  isIntervalCovered,
  parseDiaSemana,
  nombreDia,
  parseDateOnly,
  todayDateOnly,
};

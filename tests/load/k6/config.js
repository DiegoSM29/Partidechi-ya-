// Configuracion compartida de los escenarios k6.
// Todos los valores se pueden sobrescribir con variables de entorno:
//   BASE_URL, FRONTEND_URL, SLEEP_MIN, SLEEP_MAX

export const BASE_URL = __ENV.BASE_URL || "http://localhost:4100/api/v1";
export const FRONTEND_URL = __ENV.FRONTEND_URL || "http://127.0.0.1:4173";

export const SLEEP_MIN = Number(__ENV.SLEEP_MIN || 1);
export const SLEEP_MAX = Number(__ENV.SLEEP_MAX || 3);

// Objetivos acordados: p95 < 500 ms, p99 < 2 s y menos de 1% de errores.
// Los 4xx esperados (conflictos de franja, cupos llenos) no cuentan como
// fallo porque workload.js los declara con http.expectedStatuses.
export const THRESHOLDS = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<500", "p(99)<2000"],
  // Umbrales por endpoint: hacen visible en el resumen cual ruta domina la
  // latencia cuando la carga sube.
  "http_req_duration{name:GET /courts}": ["p(95)<500"],
  "http_req_duration{name:GET /courts/:id}": ["p(95)<300"],
  "http_req_duration{name:GET /courts/:id/availability}": ["p(95)<500"],
  "http_req_duration{name:GET /matches}": ["p(95)<800"],
  "http_req_duration{name:GET /reservations}": ["p(95)<500"],
  "http_req_duration{name:GET /notifications}": ["p(95)<300"],
  "http_req_duration{name:POST /reservations}": ["p(95)<800"],
  "http_req_duration{name:POST /matches/:id/join}": ["p(95)<800"],
  "http_req_duration{name:GET / (frontend)}": ["p(95)<200"],
};

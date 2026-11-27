// Escenario objetivo: 1000 usuarios concurrentes.
// Sube en 2 minutos, sostiene 1000 VUs durante 5 minutos y baja en 1 minuto.
//
// Uso:
//   k6 run load-1000.js
//
// Requiere que el seed se haya ejecutado y que backend + frontend locales
// esten arriba (ver README.md).

import { THRESHOLDS } from "./config.js";
import { runIteration } from "./workload.js";

export const options = {
  scenarios: {
    carga_1000: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 1000 },
        { duration: "5m", target: 1000 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: THRESHOLDS,
};

export default function () {
  runIteration();
}

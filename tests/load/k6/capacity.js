// Prueba de capacidad intermedia: 500 usuarios concurrentes durante 3 minutos.
// Sirve para ubicar el punto donde la latencia empieza a crecer antes de
// saltar a los 1000 VUs de load-1000.js.
//
// Uso:
//   k6 run capacity.js

import { THRESHOLDS } from "./config.js";
import { runIteration } from "./workload.js";

export const options = {
  scenarios: {
    capacidad_500: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 500 },
        { duration: "3m", target: 500 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: THRESHOLDS,
};

export default function () {
  runIteration();
}

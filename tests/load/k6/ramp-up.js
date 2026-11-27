// Rampa de subida: 20 -> 1000 usuarios en 10 minutos y 2 minutos sostenidos.
// Sirve para encontrar el punto donde la aplicacion empieza a degradarse.
//
// Uso:
//   k6 run ramp-up.js

import { THRESHOLDS } from "./config.js";
import { runIteration } from "./workload.js";

export const options = {
  scenarios: {
    rampa: {
      executor: "ramping-vus",
      startVUs: 20,
      stages: [
        { duration: "2m", target: 100 },
        { duration: "8m", target: 1000 },
        { duration: "2m", target: 1000 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: THRESHOLDS,
};

export default function () {
  runIteration();
}

// Prueba de humo: valida que el mundo sembrado y el backend respondan antes
// de lanzar la carga grande. 20 VUs durante 2 minutos.
//
// Uso:
//   k6 run smoke.js

import { THRESHOLDS } from "./config.js";
import { runIteration } from "./workload.js";

export const options = {
  vus: 20,
  duration: "2m",
  thresholds: THRESHOLDS,
};

export default function () {
  runIteration();
}

// Aplicacion Express - Partidechi ya! (arquitectura por capas)
require("./config/env"); // carga y valida variables de entorno antes que nada

const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Enrutamiento bajo el prefijo versionado
app.use("/api/v1", routes);

// Manejo de errores (el orden importa: 404 -> errorHandler)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

// Punto de entrada del servidor - Partidechi ya!
const app = require("./src/app");
const { env } = require("./src/config/env");

const server = app.listen(env.PORT, () => {
  console.log(`Servidor ejecutandose en: http://localhost:${env.PORT}/api/v1`);
});

// Cierre ordenado ante senales del sistema (Ctrl+C, etc.)
const shutdown = () => {
  console.log("\nCerrando servidor...");
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = server;

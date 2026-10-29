// Instancia unica de PrismaClient (capa de acceso a datos)
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { env } = require("../config/env");

// Genera un JWT firmado. Incluye jti (identificador unico) para poder
// revocarlo en el logout mediante la blocklist en memoria.
const signToken = (payload) =>
  jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

// Verifica firma y vigencia del token. Lanza error si es invalido o expirado.
const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);

module.exports = { signToken, verifyToken };

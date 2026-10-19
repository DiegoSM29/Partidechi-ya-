// Blocklist de tokens revocados (logout) en memoria.
// Nota: en produccion multi-instancia conviene reemplazarla por Redis o una
// tabla en PostgreSQL. Suficiente para desarrollo y despliegue single-instance.
const revokedTokens = new Map(); // jti -> fecha de expiracion (epoch ms)

const purgeExpired = () => {
  const now = Date.now();
  for (const [jti, expiresAt] of revokedTokens) {
    if (expiresAt <= now) revokedTokens.delete(jti);
  }
};

const revoke = (jti, expiresAtMs) => {
  if (!jti) return;
  purgeExpired();
  revokedTokens.set(jti, expiresAtMs);
};

const isRevoked = (jti) => {
  if (!jti) return false;
  purgeExpired();
  return revokedTokens.has(jti);
};

module.exports = { revoke, isRevoked };

// Elimina datos sensibles antes de exponer un usuario en respuestas HTTP
const toPublicUser = (user) => {
  if (!user) return null;
  const { password_hash, ...publicUser } = user;
  return publicUser;
};

module.exports = { toPublicUser };

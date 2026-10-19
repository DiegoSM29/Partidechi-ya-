// Controlador de usuarios (HU-01): perfil propio
const userService = require("../services/user.service");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/v1/users/me
const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getMe(req.user.id_usuario);
  res.status(200).json({
    success: true,
    message: "Perfil consultado correctamente",
    data: { user },
  });
});

// PATCH /api/v1/users/me
const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateMe(req.user.id_usuario, req.body || {});
  res.status(200).json({
    success: true,
    message: "Perfil actualizado correctamente",
    data: { user },
  });
});

module.exports = { getMe, updateMe };

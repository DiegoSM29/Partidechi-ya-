// Controlador de autenticacion (HU-01): traduce HTTP <-> servicio
const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body || {});
  res.status(201).json({
    success: true,
    message: "Usuario registrado correctamente",
    data: result,
  });
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body || {});
  res.status(200).json({
    success: true,
    message: "Inicio de sesion exitoso",
    data: result,
  });
});

// POST /api/v1/auth/logout
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user);
  res.status(200).json({
    success: true,
    message: "Sesion cerrada correctamente",
    data: {},
  });
});

module.exports = { register, login, logout };

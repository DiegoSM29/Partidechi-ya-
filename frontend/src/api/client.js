import axios from "axios";

const TOKEN_KEY = "partidechi_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Request: agrega "Authorization: Bearer <token>" si existe sesion activa
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: si el backend responde 401 en una ruta protegida, el token
// expiro o fue revocado (logout en otra pestaña) -> limpiamos la sesion local.
// No aplica a /auth/login ni /auth/register (ahi el 410/401 es credencial mala
// y lo debe mostrar el formulario, no cerrar sesion).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const esAuthPublico = url.includes("/auth/login") || url.includes("/auth/register");
    if (error.response?.status === 401 && !esAuthPublico && getToken()) {
      clearToken();
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }
    return Promise.reject(error);
  }
);

// Extrae el mensaje estandar del backend: { success: false, error: "..." }
export const getApiError = (error) =>
  error.response?.data?.error ||
  "No se pudo conectar con el servidor. Verifica tu conexion e intenta nuevamente.";

export default api;

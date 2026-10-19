import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api, { clearToken, getToken, setToken } from "../api/client";

// Estado global de autenticacion (HU-01):
// user, token, login(), register(), logout() y proteccion de rutas.
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // validacion inicial de la sesion

  // GET /users/me: recupera/actualiza el perfil del usuario autenticado
  const fetchPerfil = useCallback(async () => {
    const { data } = await api.get("/users/me");
    const perfil = data.data.user;
    setUser(perfil);
    return perfil;
  }, []);

  // Al montar: si hay token guardado, valida la sesion contra el backend
  useEffect(() => {
    const init = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        await fetchPerfil();
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchPerfil]);

  // El interceptor detecto un 401 en ruta protegida -> sincroniza el estado
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  const guardarSesion = (data) => {
    setToken(data.token); // LocalStorage
    setUser(data.user);
  };

  const login = async (correo, password) => {
    const { data } = await api.post("/auth/login", { correo, password });
    guardarSesion(data.data);
    return data.data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    guardarSesion(data.data);
    return data.data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout"); // revoca el token en el backend
    } catch {
      // Si el token ya era invalido, igual limpiamos el estado local
    }
    clearToken();
    setUser(null);
  };

  const value = {
    user,
    token: getToken(),
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    fetchPerfil,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de <AuthProvider>");
  }
  return context;
};

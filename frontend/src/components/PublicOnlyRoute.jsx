import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomeForRole } from "../utils/roles";
import LoadingScreen from "./LoadingScreen";

// Ruta publica (login/registro): si ya hay sesion, envia al usuario
// directamente a su vista principal para evitar ver estos formularios.
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to={getHomeForRole(user.rol)} replace />;
  }

  return children;
};

export default PublicOnlyRoute;

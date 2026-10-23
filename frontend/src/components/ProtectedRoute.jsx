import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

// Ruta privada: solo usuarios autenticados.
// Si no hay sesion, redirige a /login recordando de donde venia.
const ProtectedRoute = ({ children, rol }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (rol && user?.rol !== rol) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

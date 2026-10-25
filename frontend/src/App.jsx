import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { getHomeForRole } from "./utils/roles";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import LoadingScreen from "./components/LoadingScreen";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import OwnerCourts from "./pages/OwnerCourts";
import CourtForm from "./pages/CourtForm";
import CourtSchedule from "./pages/CourtSchedule";
import CourtSearch from "./pages/CourtSearch";
import CourtAvailability from "./pages/CourtAvailability";
import ReservationCreate from "./pages/ReservationCreate";
import ReservationPay from "./pages/ReservationPay";
import NotFound from "./pages/NotFound";

// Raiz: envia al usuario a su destino segun sesion/rol
const HomeRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return (
    <Navigate to={isAuthenticated ? getHomeForRole(user.rol) : "/login"} replace />
  );
};

const App = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1">
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courts"
          element={
            <ProtectedRoute rol="PROPIETARIO">
              <OwnerCourts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courts/new"
          element={
            <ProtectedRoute rol="PROPIETARIO">
              <CourtForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courts/:id/edit"
          element={
            <ProtectedRoute rol="PROPIETARIO">
              <CourtForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courts/:id/schedules"
          element={
            <ProtectedRoute rol="PROPIETARIO">
              <CourtSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courts/:id/horarios"
          element={
            <ProtectedRoute rol="PROPIETARIO">
              <CourtSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courts/search"
          element={
            <ProtectedRoute>
              <CourtSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courts/:id/availability"
          element={
            <ProtectedRoute>
              <CourtAvailability />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservations/new"
          element={
            <ProtectedRoute>
              <ReservationCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservations/:id/pay"
          element={
            <ProtectedRoute>
              <ReservationPay />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  </div>
);

export default App;

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, CalendarCheck, LogOut, MapPinned, Search, Trophy, UserRound, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getHomeForRole } from "../utils/roles";
import api from "../api/client";

const NavItem = ({ to, label, icon: Icon, active }) => (
  <Link
    to={to}
    aria-current={active ? "page" : undefined}
    className={`nav-item flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
      active
        ? "nav-item-active font-semibold"
        : "font-medium"
    }`}
  >
    <Icon size={16} />
    {label}
  </Link>
);

// Barra de navegacion superior: segun el estado de sesion muestra
// acciones de login/registro o el usuario con cierre de sesion.
const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [notificacionesSinLeer, setNotificacionesSinLeer] = useState(0);

  useEffect(() => {
    let activo = true;
    let cargando = false;
    if (!isAuthenticated) {
      setNotificacionesSinLeer(0);
      return () => {
        activo = false;
      };
    }

    const cargarContador = async () => {
      if (!activo || cargando || document.visibilityState === "hidden") return;
      cargando = true;
      try {
        const { data } = await api.get("/notifications/unread-count");
        if (activo) {
          const count = data?.data?.count;
          if (!Number.isInteger(count) || count < 0) {
            throw new Error("El API devolvió un contador de notificaciones no válido");
          }
          setNotificacionesSinLeer(count);
        }
      } catch (error) {
        console.error("No se pudo actualizar el contador de notificaciones", error);
      } finally {
        cargando = false;
      }
    };

    const alVolver = () => {
      if (document.visibilityState === "visible") cargarContador();
    };

    cargarContador();
    const intervalId = window.setInterval(cargarContador, 15000);
    window.addEventListener("notifications:updated", cargarContador);
    window.addEventListener("focus", cargarContador);
    window.addEventListener("online", cargarContador);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      activo = false;
      window.clearInterval(intervalId);
      window.removeEventListener("notifications:updated", cargarContador);
      window.removeEventListener("focus", cargarContador);
      window.removeEventListener("online", cargarContador);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // Cada pestana se marca activa tambien en sus vistas hijas para que el
  // usuario siempre sepa en que seccion de la aplicacion se encuentra.
  const enBuscarCanchas =
    pathname === "/courts/search" ||
    /^\/courts\/\d+\/availability$/.test(pathname) ||
    pathname === "/reservations/new" ||
    /^\/reservations\/\d+\/pay$/.test(pathname);
  const enPartidos = pathname === "/matches" || /^\/matches\/\d+$/.test(pathname);
  const enCrearPartido = pathname === "/matches/create" || pathname === "/matches/new";
  const enMisCanchas =
    pathname === "/courts" ||
    pathname === "/courts/new" ||
    /^\/courts\/\d+\/(edit|schedules|horarios)$/.test(pathname);
  const enReservas =
    pathname === "/reservations/owner" ||
    pathname === "/owner/reservations";
  const enMisReservas = pathname === "/reservations" || /^\/reservations\/\d+$/.test(pathname);
  const enPerfil = pathname === "/profile";

  return (
    <header className="navbar sticky top-0 z-40 border-b backdrop-blur">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand flex items-center gap-2 text-lg font-bold">
          <span className="navbar-brand-mark flex h-9 w-9 items-center justify-center rounded-xl">
            <Trophy size={18} />
          </span>
          <span>
            Partidechi <span className="text-emerald-600">ya!</span>
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="navbar-nav flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              {user.rol === "JUGADOR" ? (
                <>
                  <NavItem
                    to="/courts/search"
                    label="Buscar canchas"
                    icon={Search}
                    active={enBuscarCanchas}
                  />
                  <NavItem
                    to="/matches"
                    label="Partidos"
                    icon={UsersRound}
                    active={enPartidos}
                  />
                  <NavItem
                    to="/matches/create"
                    label="Crear partido"
                    icon={Trophy}
                    active={enCrearPartido}
                  />
                  <NavItem
                    to="/reservations"
                    label="Mis reservas"
                    icon={CalendarCheck}
                    active={enMisReservas}
                  />
                </>
              ) : null}
              {user.rol === "PROPIETARIO" ? (
                <>
                  <NavItem
                    to="/courts"
                    label="Mis canchas"
                    icon={MapPinned}
                    active={enMisCanchas}
                  />
                  <NavItem
                    to="/reservations/owner"
                    label="Reservas"
                    icon={CalendarCheck}
                    active={enReservas}
                  />
                </>
              ) : null}
              <Link
                to="/notifications"
                aria-label={`Notificaciones${notificacionesSinLeer > 0 ? `, ${notificacionesSinLeer} sin leer` : ""}`}
                aria-current={pathname === "/notifications" ? "page" : undefined}
                title="Notificaciones"
                className={`navbar-notifications relative rounded-lg p-2.5 transition ${
                  pathname === "/notifications"
                    ? "nav-item-active"
                    : ""
                }`}
              >
                <Bell size={18} />
                {notificacionesSinLeer > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {notificacionesSinLeer > 99 ? "99+" : notificacionesSinLeer}
                  </span>
                ) : null}
              </Link>
              <Link
                to={getHomeForRole(user.rol)}
                aria-current={enPerfil ? "page" : undefined}
                className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-sm transition sm:flex ${
                  enPerfil
                    ? "nav-item-active font-semibold"
                    : "nav-item font-medium"
                }`}
              >
                <UserRound size={16} />
                {user.nombre}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="navbar-logout flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition"
              >
                <LogOut size={16} />
                Cerrar sesion
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                aria-current={pathname === "/login" ? "page" : undefined}
                className={`nav-auth-link rounded-lg px-3 py-2 text-sm transition ${
                  pathname === "/login"
                    ? "bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
                    : "font-medium text-slate-600 hover:bg-slate-100"
                }`}
              >
                Iniciar sesion
              </Link>
              <Link
                to="/register"
                aria-current={pathname === "/register" ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname === "/register"
                    ? "bg-emerald-700 text-white ring-2 ring-emerald-300"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

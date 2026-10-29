import { Link, useLocation, useNavigate } from "react-router-dom";
import { CalendarCheck, LogOut, MapPinned, Search, Trophy, UserRound, UsersRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getHomeForRole } from "../utils/roles";

const NavItem = ({ to, label, icon: Icon, active }) => (
  <Link
    to={to}
    aria-current={active ? "page" : undefined}
    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
      active
        ? "bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
        : "font-medium text-slate-600 hover:bg-slate-100"
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
    pathname === "/reservations/owner" || pathname === "/owner/reservations";
  const enPerfil = pathname === "/profile";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Trophy size={18} />
          </span>
          <span>
            Partidechi <span className="text-emerald-600">ya!</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
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
                to={getHomeForRole(user.rol)}
                aria-current={enPerfil ? "page" : undefined}
                className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-sm transition sm:flex ${
                  enPerfil
                    ? "bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
                    : "font-medium text-slate-600 hover:bg-slate-100"
                }`}
              >
                <UserRound size={16} />
                {user.nombre}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
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
                className={`rounded-lg px-3 py-2 text-sm transition ${
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

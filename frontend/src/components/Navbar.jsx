import { Link, useNavigate } from "react-router-dom";
import { LogOut, MapPinned, Search, Trophy, UserRound, UsersRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getHomeForRole } from "../utils/roles";

// Barra de navegacion superior: segun el estado de sesion muestra
// acciones de login/registro o el usuario con cierre de sesion.
const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

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
                  <Link
                    to="/courts/search"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    <Search size={16} />
                    Buscar canchas
                  </Link>
                  <Link
                    to="/matches"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    <UsersRound size={16} />
                    Partidos
                  </Link>
                  <Link
                    to="/matches/create"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    <Trophy size={16} />
                    Crear partido
                  </Link>
                </>
              ) : null}
              {user.rol === "PROPIETARIO" ? (
                <Link
                  to="/courts"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  <MapPinned size={16} />
                  Mis canchas
                </Link>
              ) : null}
              <Link
                to={getHomeForRole(user.rol)}
                className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:flex"
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
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Iniciar sesion
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
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

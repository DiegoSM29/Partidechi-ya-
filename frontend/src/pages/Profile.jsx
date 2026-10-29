import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  CalendarDays,
  Hash,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getApiError } from "../api/client";
import {
  ESTADO_BADGE,
  ESTADO_LABEL,
  ROL_BADGE,
  ROL_LABEL,
} from "../utils/roles";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

// Vista protegida: perfil del usuario autenticado (GET /users/me)
const Profile = () => {
  const { user, logout, fetchPerfil } = useAuth();
  const navigate = useNavigate();
  const [recargando, setRecargando] = useState(false);
  const [error, setError] = useState("");

  const handleRecargar = async () => {
    setRecargando(true);
    setError("");
    try {
      await fetchPerfil();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setRecargando(false);
    }
  };

  const handleLogout = async () => {
    await logout(); // POST /auth/logout + limpieza local
    navigate("/login", { replace: true });
  };

  const iniciales = `${user.nombre?.[0] ?? ""}${user.apellido?.[0] ?? ""}`.toUpperCase();

  const datos = [
    { Icono: Mail, etiqueta: "Correo", valor: user.correo },
    { Icono: Phone, etiqueta: "Telefono", valor: user.telefono || "No registrado" },
    { Icono: ShieldCheck, etiqueta: "Rol", valor: ROL_LABEL[user.rol] ?? user.rol, badge: ROL_BADGE[user.rol] },
    { Icono: BadgeCheck, etiqueta: "Estado", valor: ESTADO_LABEL[user.estado] ?? user.estado, badge: ESTADO_BADGE[user.estado] },
    { Icono: Hash, etiqueta: "ID de usuario", valor: user.id_usuario },
    {
      Icono: CalendarDays,
      etiqueta: "Fecha de registro",
      valor: new Date(user.fecha_registro).toLocaleString("es-ES", {
        dateStyle: "long",
        timeStyle: "short",
      }),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Cabecera con avatar, nombre y acciones */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-bold text-white">
            {iniciales}
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {user.nombre} {user.apellido}
            </h1>
            <p className="text-sm text-slate-500">Tu perfil en Partidechi ya!</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRecargar}
            disabled={recargando}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={recargando ? "animate-spin" : ""} />
            Recargar datos
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
          >
            <LogOut size={16} />
            Cerrar sesion
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert tipo="error">{error}</Alert>
        </div>
      ) : null}

      {/* Tarjeta de datos: consumidos desde GET /api/v1/users/me */}
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <UserRound size={16} />
          Datos de la cuenta
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {datos.map(({ Icono, etiqueta, valor, badge }) => (
            <div key={etiqueta} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Icono size={16} />
              </span>
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {etiqueta}
                </dt>
                <dd className="mt-0.5 break-words text-sm font-medium text-slate-900">
                  {badge ? (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badge}`}>
                      {valor}
                    </span>
                  ) : (
                    valor
                  )}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Sesión protegida con JWT · Los datos se validan contra el backend en cada carga
      </p>
    </div>
  );
};

export default Profile;

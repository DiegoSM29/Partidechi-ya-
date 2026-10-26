import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, MapPinned, Users, UserRound, ArrowLeft, Lock, LogIn, LogOut, Trash2, Map } from "lucide-react";
import { deleteMatch, getMatchById, joinMatch, leaveMatch } from "../api/matches";
import { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";

const CourtLocationModal = lazy(() => import("../components/CourtLocationModal"));

const MatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [partido, setPartido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accion, setAccion] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const [mostrarMapa, setMostrarMapa] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getMatchById(id);
      setPartido(data?.data?.partido || null);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [id]);

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(Date.now()), 15_000);
    return () => window.clearInterval(intervalo);
  }, []);

  const formatearFecha = (fecha) => {
    try {
      return new Date(fecha).toLocaleString("es-ES", {
        dateStyle: "full",
        timeStyle: "short",
      });
    } catch {
      return fecha;
    }
  };

  const yaUnido = partido?.participantes?.some(
    (p) => p.id_usuario === user?.id_usuario && p.estado === "ACEPTADO"
  );
  const esOrganizador = partido?.id_organizador === user?.id_usuario;
  const puedeEliminar =
    partido?.estado === "PUBLICADO" &&
    new Date(partido.fecha_hora).getTime() - Date.now() >= 24 * 60 * 60 * 1000;
  const puedeConfirmarAsistencia =
    partido?.estado === "PUBLICADO" &&
    ahora <= new Date(partido.fecha_hora).getTime() - 30 * 60 * 1000;
  const aceptados = partido?.participantes?.filter((p) => p.estado === "ACEPTADO") || [];
  const plazasLibres = partido ? partido.jugadores_maximos - aceptados.length : 0;
  const montoReserva = Number(partido?.reserva?.monto_total);
  const aporteMinimo = Number.isFinite(montoReserva)
    ? montoReserva / partido.jugadores_maximos
    : null;
  const aporteMaximo = Number.isFinite(montoReserva) && aceptados.length > 0
    ? montoReserva / (aceptados.length + 1)
    : null;
  const formatoMoneda = (monto) =>
    new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(monto);

  const handleUnirse = async () => {
    setAccion(true);
    setError("");
    try {
      const { data } = await joinMatch(id);
      setPartido(data?.data?.partido || null);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setAccion(false);
    }
  };

  const handleAbandonar = async () => {
    setAccion(true);
    setError("");
    try {
      await leaveMatch(id);
      await cargar();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setAccion(false);
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm("¿Deseas eliminar este partido? Solo puede eliminarse con al menos 24 horas de anticipación.")) {
      return;
    }
    setEliminando(true);
    setError("");
    try {
      await deleteMatch(id);
      navigate("/matches");
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setEliminando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!partido) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert tipo="error">Partido no encontrado</Alert>
        <button
          onClick={() => navigate("/matches")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm"
        >
          <ArrowLeft size={16} />
          Volver a partidos
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button
        onClick={() => navigate("/matches")}
        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Volver a partidos
      </button>

      {error ? <Alert tipo="error">{error}</Alert> : null}

      <div className="mt-4 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{partido.nombre}</h1>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                {partido.estado}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{partido.deporte} · Organizado por {partido.organizador?.nombre} {partido.organizador?.apellido}</p>
          </div>
          <div className="flex gap-2">
            {esOrganizador && partido.estado === "PUBLICADO" && puedeEliminar ? (
              <button
                onClick={handleEliminar}
                disabled={eliminando}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Trash2 size={16} />
                {eliminando ? "Eliminando..." : "Eliminar partido"}
              </button>
            ) : null}
            {user?.rol === "JUGADOR" && !esOrganizador && partido.estado === "PUBLICADO" ? (
              yaUnido ? (
                <button
                  onClick={handleAbandonar}
                  disabled={accion}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <LogOut size={16} />
                  Abandonar partido
                </button>
              ) : (
                <>
                  {partido.reserva?.cancha ? (
                    <button
                      type="button"
                      onClick={() => setMostrarMapa(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Map size={16} />
                      Ver mapa de la cancha
                    </button>
                  ) : null}
                  {!puedeConfirmarAsistencia ? (
                    <span className="inline-flex items-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600">
                      Cerró la confirmación de asistencia
                    </span>
                  ) : plazasLibres > 0 ? (
                    <button
                      onClick={handleUnirse}
                      disabled={accion}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <LogIn size={16} />
                      Confirmar asistencia
                    </button>
                  ) : (
                    <span className="inline-flex items-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600">
                      Sin plazas disponibles
                    </span>
                  )}
                </>
              )
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Información del encuentro</h2>
            <dl className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-slate-400" />
                <span>{formatearFecha(partido.fecha_hora)}</span>
              </div>
              {partido.reserva?.cancha ? (
                <>
                  <div className="flex items-center gap-2">
                    <MapPinned size={16} className="text-slate-400" />
                    <span>{partido.reserva.cancha.nombre}</span>
                  </div>
                  <div className="pl-6 text-slate-500">{partido.reserva.cancha.ubicacion}</div>
                </>
              ) : null}
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <span>{aceptados.length} / {partido.jugadores_maximos} jugadores</span>
              </div>
              <div className="pl-6 text-slate-500">
                Plazas disponibles: {Math.max(0, plazasLibres)}
              </div>
            </dl>
            {partido.descripcion ? (
              <div>
                <h3 className="text-sm font-medium text-slate-900">Descripción</h3>
                <p className="mt-1 text-sm text-slate-600">{partido.descripcion}</p>
              </div>
            ) : null}
            {partido.id_reserva ? (
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
                Asociado a reserva #{partido.id_reserva} (confirmada)
              </div>
            ) : null}
            {user?.rol === "JUGADOR" &&
            !yaUnido &&
            !esOrganizador &&
            partido.estado === "PUBLICADO" &&
            puedeConfirmarAsistencia &&
            plazasLibres > 0 ? (
              <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Información para unirte</p>
                {Number.isFinite(montoReserva) && partido.jugadores_maximos > 0 ? (
                  <p>
                    <span className="font-medium">Aporte estimado si te unes:</span>{" "}
                    {formatoMoneda(Math.min(aporteMinimo, aporteMaximo))} –{" "}
                    {formatoMoneda(Math.max(aporteMinimo, aporteMaximo))}, según el número
                    total de plazas y los jugadores actuales.
                  </p>
                ) : null}
                <p>
                  Es solo un estimado informativo: no se realiza ningún cobro ni pago por PayPal.
                </p>
              </div>
            ) : null}
            {esOrganizador ? (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                <Lock size={15} className="mt-0.5 shrink-0" />
                <span>
                  Los datos del partido no pueden modificarse. Puedes eliminarlo solo con
                  al menos 24 horas de anticipación; los jugadores pueden unirse o abandonar
                  desde esta misma página.
                </span>
              </div>
            ) : null}
            {esOrganizador && partido.estado === "PUBLICADO" && !puedeEliminar ? (
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
                Ya no es posible eliminar este partido: debe hacerse con al menos 24 horas de anticipación.
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Participantes</h2>
            <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
              {aceptados.length === 0 ? (
                <li className="p-4 text-sm text-slate-500">Aún no hay participantes</li>
              ) : (
                aceptados.map((p) => (
                  <li key={p.id_participante} className="flex items-center gap-3 p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <UserRound size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {p.usuario?.nombre} {p.usuario?.apellido}
                        {p.id_usuario === partido.id_organizador ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Organizador
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500">{p.usuario?.correo}</p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        {mostrarMapa && partido.reserva?.cancha ? (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60">
                <Spinner className="h-7 w-7 text-white" />
              </div>
            }
          >
            <CourtLocationModal
              cancha={partido.reserva.cancha}
              onClose={() => setMostrarMapa(false)}
            />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
};

export default MatchDetail;

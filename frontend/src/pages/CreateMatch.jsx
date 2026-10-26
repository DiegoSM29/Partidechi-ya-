import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Trophy } from "lucide-react";
import { getReservations } from "../api/reservations";
import { createMatch } from "../api/matches";
import { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

const CreateMatch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    id_reserva: location.state?.id_reserva || "",
    nombre: "",
    deporte: "",
    jugadores_maximos: "",
    descripcion: "",
  });
  const reservasConfirmadas = reservas.filter(
    (reserva) => reserva.estado === "CONFIRMADA" && !reserva.partido
  );
  const reservaSeleccionada = reservasConfirmadas.find((r) => r.id_reserva == form.id_reserva);

  const formatearFechaReserva = (fecha) => {
    if (!fecha) return "Sin fecha";
    try {
      return new Date(fecha).toLocaleDateString("es-ES", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return String(fecha);
    }
  };

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getReservations();
      const list = data?.data?.reservas || [];
      setReservas(list);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!confirmacionAbierta) return undefined;
    const cerrarConEscape = (event) => {
      if (event.key === "Escape" && !guardando) setConfirmacionAbierta(false);
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [confirmacionAbierta, guardando]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setConfirmacionAbierta(true);
  };

  const handleConfirmarCreacion = async () => {
    setGuardando(true);
    setError("");
    try {
      const payload = {
        id_reserva: Number(form.id_reserva),
        nombre: form.nombre,
        deporte: reservaSeleccionada?.cancha?.deporte || form.deporte,
        jugadores_maximos: Number(form.jugadores_maximos),
        descripcion: form.descripcion || undefined,
      };
      const { data } = await createMatch(payload);
      setConfirmacionAbierta(false);
      const partido = data?.data?.partido;
      if (partido?.id_partido) {
        navigate(`/matches/${partido.id_partido}`);
      } else {
        navigate("/matches");
      }
    } catch (e) {
      setError(getApiError(e));
      setConfirmacionAbierta(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Crear partido amistoso</h1>
        <p className="text-sm text-slate-500">
          Debes asociarlo a una reserva confirmada. Antes de crearlo verás un resumen para
          confirmar los datos; una vez creado, el partido no podrá modificarse.
        </p>
      </div>

      {error ? <Alert tipo="error">{error}</Alert> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div>
            <label className="text-sm font-medium text-slate-700">Reserva</label>
            <select
              name="id_reserva"
              value={form.id_reserva}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecciona una reserva</option>
              {reservasConfirmadas.map((r) => (
                <option key={r.id_reserva} value={r.id_reserva}>
                  #{r.id_reserva} · {r.cancha?.nombre} ({r.cancha?.deporte}) · {formatearFechaReserva(r.fecha)} {r.hora_inicio}-{r.hora_fin} · {r.estado}
                </option>
              ))}
            </select>
            {reservasConfirmadas.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                No tienes reservas confirmadas sin un partido asociado. Una reserva se confirma automáticamente al pagar la cancha.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Solo se muestran reservas confirmadas que todavía no tienen un partido asociado.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Nombre del partido</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                placeholder="Ej. Partidito del sábado"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Deporte</label>
              <input
                name="deporte"
                value={reservaSeleccionada?.cancha?.deporte || form.deporte}
                readOnly
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Número máximo de jugadores</label>
              <input
                name="jugadores_maximos"
                type="number"
                min="1"
                value={form.jugadores_maximos}
                onChange={handleChange}
                required
                placeholder={
                  reservaSeleccionada?.cancha?.jugadores_maximos
                    ? `Máx. según cancha: ${reservaSeleccionada.cancha.jugadores_maximos}`
                    : ""
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              {reservaSeleccionada?.cancha?.jugadores_maximos ? (
                <p className="mt-1 text-xs text-slate-500">
                  Máximo permitido por la cancha: {reservaSeleccionada.cancha.jugadores_maximos}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Descripción (opcional)</label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Coordina con tus amigos..."
            />
          </div>

            <button
              type="submit"
              disabled={guardando || reservasConfirmadas.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Trophy size={16} />
              Revisar y crear partido
            </button>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
              Al confirmar la creación, el partido quedará publicado y no podrá modificarse.
            </p>
          </form>

          {confirmacionAbierta ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirmar-partido-titulo"
            >
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <h2
                  id="confirmar-partido-titulo"
                  className="text-lg font-semibold text-slate-900"
                >
                  Confirmar creación del partido
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Revisa los datos. Una vez creado, el partido no podrá modificarse.
                </p>

                <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm ring-1 ring-inset ring-slate-200">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Reserva</dt>
                    <dd className="text-right font-medium text-slate-900">
                      #{form.id_reserva}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Cancha</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {reservaSeleccionada?.cancha?.nombre || "Sin cancha"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Fecha y hora</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {formatearFechaReserva(reservaSeleccionada?.fecha)} ·{" "}
                      {reservaSeleccionada?.hora_inicio}-{reservaSeleccionada?.hora_fin}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Nombre</dt>
                    <dd className="text-right font-medium text-slate-900">{form.nombre}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Deporte</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {reservaSeleccionada?.cancha?.deporte || form.deporte}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Máximo de jugadores</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {form.jugadores_maximos}
                    </dd>
                  </div>
                  {form.descripcion ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Descripción</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {form.descripcion}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Esta acción es definitiva: después de crear el partido no se podrán cambiar
                    su nombre, jugadores ni descripción.
                  </span>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmacionAbierta(false)}
                    disabled={guardando}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Revisar datos
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarCreacion}
                    disabled={guardando}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    <Trophy size={16} />
                    {guardando ? "Creando partido..." : "Sí, crear partido"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default CreateMatch;

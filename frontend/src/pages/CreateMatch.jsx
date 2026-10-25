import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
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
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    id_reserva: location.state?.id_reserva || "",
    nombre: "",
    deporte: "",
    jugadores_maximos: "",
    descripcion: "",
  });
  const reservasConfirmadas = reservas.filter((reserva) => reserva.estado === "CONFIRMADA");

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getReservations();
      const list = data?.data?.reservas || [];
      // Mostrar todas las reservas del jugador para poder organizador verlas
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const reservaSeleccionada = reservas.find((r) => r.id_reserva == form.id_reserva);
      const payload = {
        id_reserva: Number(form.id_reserva),
        nombre: form.nombre,
        deporte: reservaSeleccionada?.cancha?.deporte || form.deporte,
        jugadores_maximos: Number(form.jugadores_maximos),
        descripcion: form.descripcion || undefined,
      };
      const { data } = await createMatch(payload);
      const partido = data?.data?.partido;
      if (partido?.id_partido) {
        navigate(`/matches/${partido.id_partido}`);
      } else {
        navigate("/matches");
      }
    } catch (e) {
      setError(getApiError(e));
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
          Debes asociarlo a una reserva confirmada. Indica fecha/hora desde la reserva, deporte y número máximo de jugadores.
        </p>
      </div>

      {error ? <Alert tipo="error">{error}</Alert> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
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
                  #{r.id_reserva} · {r.cancha?.nombre} ({r.cancha?.deporte}) · {new Date(r.fecha).toLocaleDateString("es-ES")} {r.hora_inicio}-{r.hora_fin} · {r.estado}
                </option>
              ))}
            </select>
            {reservasConfirmadas.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                No tienes reservas confirmadas. Una reserva se confirma automáticamente al pagar la cancha.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Solo se muestran reservas confirmadas y listas para organizar el partido.</p>
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
                value={(() => {
                  const r = reservas.find((res) => res.id_reserva == form.id_reserva);
                  return r?.cancha?.deporte || form.deporte;
                })()}
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
                placeholder={(() => {
                  const r = reservas.find((res) => res.id_reserva == form.id_reserva);
                  return r?.cancha?.jugadores_maximos ? `Máx. según cancha: ${r.cancha.jugadores_maximos}` : "";
                })()}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              {(() => {
                const r = reservas.find((res) => res.id_reserva == form.id_reserva);
                return r?.cancha?.jugadores_maximos ? (
                  <p className="mt-1 text-xs text-slate-500">Máximo permitido por la cancha: {r.cancha.jugadores_maximos}</p>
                ) : null;
              })()}
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
            {guardando ? "Creando..." : "Crear partido"}
          </button>
        </form>
      )}
    </div>
  );
};

export default CreateMatch;

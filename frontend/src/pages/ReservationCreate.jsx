import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, CreditCard } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "../components/Alert";

const ReservationCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const {
    id_cancha,
    cancha,
    fecha,
    hora_inicio,
    hora_fin,
    precio_hora,
  } = state;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!id_cancha || !fecha || !hora_inicio || !hora_fin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert>Faltan datos para crear la reserva. Selecciona un horario desde la disponibilidad.</Alert>
        <Link
          to={id_cancha ? `/courts/${id_cancha}/availability` : "/courts/search"}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700"
        >
          <ArrowLeft size={16} />
          Volver
        </Link>
      </div>
    );
  }

  const precio = Number(precio_hora || cancha?.precio_hora || 0);
  const [inicioMin, finMin] = [hora_inicio.split(":"), hora_fin.split(":")].map(([h,m]) => Number(h)*60+Number(m));
  const duracionHoras = Math.max(0, (finMin - inicioMin) / 60);
  const montoTotal = Math.round(duracionHoras * precio * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/reservations", {
        id_cancha,
        fecha,
        hora_inicio,
        hora_fin,
      });
      const reserva = data?.data?.reserva;
      navigate(`/reservations/${reserva.id_reserva}/pay`, {
        state: { reserva, cancha: cancha || data?.data?.cancha },
      });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <header className="mb-6">
        <Link
          to={`/courts/${id_cancha}/availability?fecha=${fecha}`}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Volver a disponibilidad
        </Link>
        <p className="text-sm font-semibold text-emerald-700">RESERVAR CANCHA</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {cancha?.nombre || "Cancha"}
        </h1>
      </header>

      {error ? (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Detalles de la reserva</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <span>Fecha: {fecha}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              <span>Horario: {hora_inicio} - {hora_fin}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-slate-400" />
              <span>Precio por hora: Bs. {precio.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              <span>Duración: {duracionHoras.toFixed(2)} h</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? "Solicitando reserva..." : "Solicitar reserva y pasar a pago"}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            El sistema valida la disponibilidad nuevamente al crear la reserva. Puedes reservar más de una hora (bloques consecutivos). La cancha quedará pendiente hasta registrar el pago; una vez confirmado el pago, la reserva se confirma automáticamente.
          </p>
        </form>

        <aside className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Importe</h2>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-sm text-slate-600">Total a pagar</span>
            <span className="text-2xl font-bold text-emerald-800">Bs. {montoTotal.toFixed(2)}</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            La reserva queda en estado PENDIENTE hasta que se registre el pago. Al aprobarse o capturarse el pago, se confirma automáticamente y podrás organizar un partido con esa reserva.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default ReservationCreate;

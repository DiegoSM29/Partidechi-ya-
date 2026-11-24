import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock3, MapPinned, Search } from "lucide-react";
import { getApiError } from "../api/client";
import { getReservations } from "../api/reservations";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

const TABS = [
  { id: "PROXIMAS", label: "Próximas" },
  { id: "PASADAS", label: "Pasadas" },
  { id: "CANCELADAS", label: "Canceladas" },
];

const ESTADO_RESERVA = {
  PENDIENTE: { label: "Pendiente", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  CONFIRMADA: { label: "Confirmada", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  CANCELADA: { label: "Cancelada", badge: "bg-red-50 text-red-700 ring-red-200" },
  COMPLETADA: { label: "Completada", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
};

const ESTADO_PAGO = {
  PENDIENTE: {
    label: "Pendiente de verificación",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  APROBADO: {
    label: "Aprobado",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  RECHAZADO: { label: "Rechazado", badge: "bg-red-50 text-red-700 ring-red-200" },
  REEMBOLSADO: {
    label: "Reembolsado",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
  },
};

const getDateText = (fecha) => {
  if (!fecha) return "";
  const parsed = new Date(fecha);
  return Number.isNaN(parsed.getTime()) ? String(fecha) : parsed.toISOString().slice(0, 10);
};

const formatDate = (fecha) => {
  if (!fecha) return "Sin fecha";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return String(fecha);
  return parsed.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const isPastReservation = (reserva) => {
  if (reserva.estado === "COMPLETADA") return true;
  const reservationDate = getDateText(reserva.fecha);
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (reservationDate < today) return true;
  if (reservationDate > today) return false;

  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
  return reserva.hora_fin <= currentTime;
};

const StatusBadge = ({ status, labels }) => {
  const value = labels[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        value?.badge || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {value?.label || status}
    </span>
  );
};

const MyReservations = () => {
  const [reservas, setReservas] = useState([]);
  const [tab, setTab] = useState("PROXIMAS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReservations = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getReservations();
        setReservas(data?.data?.reservas || []);
      } catch (err) {
        setError(getApiError(err));
      } finally {
        setLoading(false);
      }
    };

    loadReservations();
  }, []);

  const reservasVisibles = useMemo(
    () =>
      reservas
        .filter((reserva) => {
          if (tab === "CANCELADAS") return reserva.estado === "CANCELADA";
          if (reserva.estado === "CANCELADA") return false;
          return tab === "PASADAS" ? isPastReservation(reserva) : !isPastReservation(reserva);
        })
        .sort((a, b) => {
          const dateA = `${getDateText(a.fecha)} ${a.hora_inicio}`;
          const dateB = `${getDateText(b.fecha)} ${b.hora_inicio}`;
          return tab === "PROXIMAS" ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
        }),
    [reservas, tab]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-7 border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-emerald-700">HISTORIAL DEL JUGADOR</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Mis reservas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Consulta tus próximos turnos, reservas pasadas y cancelaciones.
        </p>
      </header>

      {error ? (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar reservas">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === id
                ? "bg-emerald-700 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner /> Cargando reservas...
        </div>
      ) : reservas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <Search className="mx-auto text-slate-400" size={26} />
          <h2 className="mt-3 text-base font-semibold text-slate-900">Aún no tienes reservas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Busca una cancha y reserva un turno para que aparezca aquí.
          </p>
          <Link
            to="/courts/search"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Buscar canchas
          </Link>
        </div>
      ) : reservasVisibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <CalendarDays className="mx-auto text-slate-400" size={25} />
          <p className="mt-3 text-sm font-medium text-slate-800">
            No tienes reservas{" "}
            {tab === "PROXIMAS" ? "próximas" : tab === "PASADAS" ? "pasadas" : "canceladas"}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservasVisibles.map((reserva) => {
            const pagos = reserva.pagos || [];
            return (
              <article
                key={reserva.id_reserva}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">
                        Reserva #{reserva.id_reserva}
                      </h2>
                      <StatusBadge status={reserva.estado} labels={ESTADO_RESERVA} />
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-800">
                      <MapPinned size={15} className="shrink-0 text-slate-400" />
                      <span className="font-medium">{reserva.cancha?.nombre || "Cancha"}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {reserva.cancha?.ubicacion || "Ubicación no disponible"}
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Importe</p>
                    <p className="mt-1 text-xl font-bold text-emerald-800">
                      Bs. {Number(reserva.monto_total || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 bg-slate-50/60 px-5 py-4 text-sm text-slate-700 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="shrink-0 text-slate-400" />
                    <span>{formatDate(reserva.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 size={16} className="shrink-0 text-slate-400" />
                    <span>{reserva.hora_inicio} - {reserva.hora_fin}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Pago:</span>
                    {pagos.length ? (
                      pagos.map((pago) => (
                        <StatusBadge
                          key={pago.id_pago}
                          status={pago.estado}
                          labels={ESTADO_PAGO}
                        />
                      ))
                    ) : (
                      <span className="text-sm text-slate-600">Sin pagos registrados</span>
                    )}
                  </div>
                  <Link
                    to={`/reservations/${reserva.id_reserva}`}
                    className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyReservations;

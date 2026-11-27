import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock3, CreditCard, MapPinned } from "lucide-react";
import { getApiError } from "../api/client";
import { getReservationById } from "../api/reservations";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

const ESTADO_RESERVA = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
};

const ESTADO_PAGO = {
  PENDIENTE: "Pendiente de verificación",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  REEMBOLSADO: "Reembolsado",
};

const formatDate = (fecha) => {
  if (!fecha) return "Sin fecha";
  const parsed = new Date(fecha);
  return Number.isNaN(parsed.getTime())
    ? String(fecha)
    : parsed.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
};

const ReservationDetail = () => {
  const { id } = useParams();
  const [reserva, setReserva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadReservation = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getReservationById(id);
        if (active) setReserva(data?.data?.reserva || null);
      } catch (err) {
        if (active) setError(getApiError(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReservation();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Spinner /> Cargando detalle...
      </div>
    );
  }

  if (error || !reserva) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <div className="mb-5">
          <Alert>{error || "No se encontró la reserva."}</Alert>
        </div>
        <Link
          to="/reservations"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Volver a mis reservas
        </Link>
      </div>
    );
  }

  const pagos = reserva.pagos || [];
  const estado = ESTADO_RESERVA[reserva.estado] || reserva.estado;
  const puedePagar = reserva.estado === "PENDIENTE";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <Link
        to="/reservations"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
      >
        <ArrowLeft size={16} /> Mis reservas
      </Link>

      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">DETALLE DE RESERVA</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Reserva #{reserva.id_reserva}
            </h1>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {estado}
          </span>
        </header>

        <section className="space-y-4 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <MapPinned size={18} className="text-emerald-700" />
              {reserva.cancha?.nombre || "Cancha"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {reserva.cancha?.ubicacion || "Ubicación no disponible"}
            </p>
            {reserva.cancha?.deporte ? (
              <p className="mt-1 text-sm capitalize text-slate-500">{reserva.cancha.deporte}</p>
            ) : null}
          </div>

          <div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <CalendarDays size={17} className="mt-0.5 shrink-0 text-slate-400" />
              <span>{formatDate(reserva.fecha)}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Clock3 size={17} className="mt-0.5 shrink-0 text-slate-400" />
              <span>{reserva.hora_inicio} - {reserva.hora_fin}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm font-medium text-slate-600">Importe total</span>
            <span className="text-xl font-bold text-emerald-800">
              Bs. {Number(reserva.monto_total || 0).toFixed(2)}
            </span>
          </div>
        </section>

        <section className="border-t border-slate-100 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <CreditCard size={17} className="text-slate-500" />
            Estado de pago
          </h2>
          {pagos.length ? (
            <ul className="mt-3 space-y-2">
              {pagos.map((pago) => (
                <li
                  key={pago.id_pago}
                  className="flex flex-col gap-1 rounded-lg border border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    {pago.metodo_pago || "Pago"} · Bs. {Number(pago.monto || 0).toFixed(2)}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {ESTADO_PAGO[pago.estado] || pago.estado}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Sin pagos registrados</p>
          )}
        </section>
      </article>

      {puedePagar ? (
        <Link
          to={`/reservations/${reserva.id_reserva}/pay`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto"
        >
          Ir al pago
        </Link>
      ) : null}
    </div>
  );
};

export default ReservationDetail;

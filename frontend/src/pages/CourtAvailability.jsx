import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, MapPinned } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

const CourtLocationModal = lazy(() => import("../components/CourtLocationModal"));

const CourtAvailability = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fechaParam = searchParams.get("fecha") || searchParams.get("date") || "";

  const [cancha, setCancha] = useState(null);
  const [fecha, setFecha] = useState(fechaParam);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [canchaEnMapa, setCanchaEnMapa] = useState(null);
  const [horariosSeleccionados, setHorariosSeleccionados] = useState([]);

  const minutosDeHora = (hora) => {
    const [horas, minutos] = hora.split(":").map(Number);
    return horas * 60 + minutos;
  };

  const cargarDisponibilidad = async (fechaSeleccionada = fecha) => {
    setCargando(true);
    setError("");
    try {
      const params = {};
      if (fechaSeleccionada) params.fecha = fechaSeleccionada;
      const { data } = await api.get(`/courts/${id}/availability`, { params });
      setDisponibilidad(data?.data || null);
      if (data?.data?.cancha) {
        setCancha(data.data.cancha);
      }
      if (fechaSeleccionada) {
        setFecha(fechaSeleccionada);
        setSearchParams({ fecha: fechaSeleccionada });
      } else if (data?.data?.fecha) {
        setFecha(data.data.fecha);
      }
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDisponibilidad(fechaParam || fecha);
  }, [id]);

  const handleBuscar = (e) => {
    e.preventDefault();
    cargarDisponibilidad(fecha);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/courts/search"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Volver a búsqueda
          </Link>
          <p className="text-sm font-semibold text-emerald-700">HORARIOS DISPONIBLES</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {cancha?.nombre || disponibilidad?.cancha?.nombre || "Cancha"}
          </h1>
          {(cancha?.ubicacion || disponibilidad?.cancha?.ubicacion) ? (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="flex items-center gap-1.5 text-sm text-slate-600">
                <MapPin size={16} className="shrink-0" />
                <span>{cancha?.ubicacion || disponibilidad?.cancha?.ubicacion}</span>
              </p>
              <button
                type="button"
                onClick={() => setCanchaEnMapa(cancha || disponibilidad?.cancha)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                title="Ver ubicación en el mapa"
              >
                <MapPinned size={14} />
                Ver ubicación de la cancha
              </button>
            </div>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Precio por hora</p>
          <p className="text-xl font-semibold text-emerald-800">
            Bs. {Number(cancha?.precio_hora || disponibilidad?.cancha?.precio_hora || 0).toFixed(2)}
          </p>
        </div>
      </header>

      <form onSubmit={handleBuscar} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fecha" className="text-sm font-medium text-slate-700">
            Seleccionar fecha
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setHorariosSeleccionados([]);
              }}
              className="rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Consultar disponibilidad
        </button>
      </form>

      {error ? (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner /> Cargando horarios disponibles...
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {disponibilidad?.dia || ""} {disponibilidad?.fecha || fecha}
              </p>
              <p className="text-sm text-slate-500">
                {disponibilidad?.disponibles?.length || 0} turnos disponibles
              </p>
            </div>
            {disponibilidad?.horarios?.length === 0 ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                No hay horarios configurados para este día
              </span>
            ) : null}
          </div>

          {Array.isArray(disponibilidad?.slots) && disponibilidad.slots.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {disponibilidad.slots.map((slot, index) => {
                    const seleccionado = horariosSeleccionados.some(
                      (seleccionado) =>
                        seleccionado.hora_inicio === slot.hora_inicio &&
                        seleccionado.hora_fin === slot.hora_fin
                    );
                    return (
                      <button
                        key={`${slot.hora_inicio}-${index}`}
                        type="button"
                        disabled={!slot.disponible}
                        onClick={() => {
                          if (!slot.disponible) return;
                          const existe = horariosSeleccionados.some(
                            (seleccionado) =>
                              seleccionado.hora_inicio === slot.hora_inicio &&
                              seleccionado.hora_fin === slot.hora_fin
                          );
                          if (existe) {
                            const posicion = horariosSeleccionados.findIndex(
                              (seleccionado) =>
                                seleccionado.hora_inicio === slot.hora_inicio &&
                                seleccionado.hora_fin === slot.hora_fin
                            );
                            if (
                              horariosSeleccionados.length > 1 &&
                              posicion > 0 &&
                              posicion < horariosSeleccionados.length - 1
                            ) {
                              setError("Para mantener una sola reserva, quita primero las horas desde uno de los extremos.");
                              return;
                            }
                            setHorariosSeleccionados((seleccionados) =>
                              seleccionados.filter(
                                (seleccionado) =>
                                  seleccionado.hora_inicio !== slot.hora_inicio ||
                                  seleccionado.hora_fin !== slot.hora_fin
                              )
                            );
                          } else {
                            const contiguo = horariosSeleccionados.length === 0 ||
                              horariosSeleccionados.some(
                                (seleccionado) =>
                                  minutosDeHora(seleccionado.hora_fin) === minutosDeHora(slot.hora_inicio) ||
                                  minutosDeHora(slot.hora_fin) === minutosDeHora(seleccionado.hora_inicio)
                              );
                            if (!contiguo) {
                              setError("Selecciona horas contiguas para crear una sola reserva.");
                              return;
                            }
                            setHorariosSeleccionados((seleccionados) =>
                              [...seleccionados, slot].sort((a, b) =>
                                a.hora_inicio.localeCompare(b.hora_inicio)
                              )
                            );
                          }
                          setError("");
                        }}
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                          !slot.disponible
                            ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                            : seleccionado
                            ? "border-emerald-700 bg-emerald-100"
                            : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock size={16} className={slot.disponible ? "text-emerald-700" : "text-slate-400"} />
                          <span
                            className={`text-sm font-medium ${
                              slot.disponible ? "text-emerald-900" : "text-slate-500"
                            }`}
                          >
                            {slot.hora_inicio} - {slot.hora_fin}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            slot.disponible ? "text-emerald-700" : "text-slate-500"
                          }`}
                        >
                          {slot.disponible ? (seleccionado ? "Seleccionado" : "Seleccionar") : "No disponible"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm h-fit">
                <p className="text-sm font-semibold text-slate-900">Horarios seleccionados</p>
                <div className="mt-3 space-y-2">
                  {horariosSeleccionados.length === 0 ? (
                    <p className="text-xs text-slate-500">Selecciona una o varias horas contiguas.</p>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>
                        {horariosSeleccionados[0].hora_inicio} -{" "}
                        {horariosSeleccionados[horariosSeleccionados.length - 1].hora_fin}
                      </span>
                      <span className="text-xs text-slate-500">
                        {horariosSeleccionados.length} {horariosSeleccionados.length === 1 ? "hora" : "horas"}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={horariosSeleccionados.length === 0}
                  onClick={() => {
                    if (horariosSeleccionados.length === 0) return;
                    navigate("/reservations/new", {
                      state: {
                        id_cancha: id,
                        cancha: cancha || disponibilidad?.cancha,
                        fecha: fecha || disponibilidad?.fecha,
                        hora_inicio: horariosSeleccionados[0].hora_inicio,
                        hora_fin: horariosSeleccionados[horariosSeleccionados.length - 1].hora_fin,
                        precio_hora: cancha?.precio_hora || disponibilidad?.cancha?.precio_hora,
                      },
                    });
                  }}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  Empezar a pagar
                </button>
              </aside>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <Clock className="mx-auto text-slate-400" size={25} />
              <p className="mt-3 text-sm font-medium text-slate-800">
                No hay turnos disponibles para esta fecha
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {disponibilidad?.horarios?.length === 0
                  ? "La cancha no tiene horarios configurados para este día. Solo las franjas registradas son reservables."
                  : "Todos los turnos de este día ya se encuentran confirmados/reservados o no hay disponibilidad."}
              </p>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Precios y características</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Precio por hora</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  Bs. {Number(cancha?.precio_hora || disponibilidad?.cancha?.precio_hora || 0).toFixed(2)}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Deporte</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {cancha?.deporte || disponibilidad?.cancha?.deporte}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3 sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Ubicación</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {cancha?.ubicacion || disponibilidad?.cancha?.ubicacion}
                </dd>
              </div>
            </dl>
          </div>
        </>
      )}
      {canchaEnMapa ? (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60">
              <Spinner className="h-7 w-7 text-white" />
            </div>
          }
        >
          <CourtLocationModal cancha={canchaEnMapa} onClose={() => setCanchaEnMapa(null)} />
        </Suspense>
      ) : null}
    </div>
  );
};

export default CourtAvailability;

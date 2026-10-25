import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Filter,
  Mail,
  MapPinned,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import api, { getApiError } from "../api/client";
import { getReservations, verifyPayment } from "../api/reservations";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

const ESTADO_RESERVA_LABEL = {
  PENDIENTE: "Pendiente de pago",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
};

const ESTADO_RESERVA_BADGE = {
  PENDIENTE: "bg-amber-50 text-amber-700 ring-amber-200",
  CONFIRMADA: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELADA: "bg-red-50 text-red-700 ring-red-200",
  COMPLETADA: "bg-slate-100 text-slate-600 ring-slate-200",
};

const ESTADO_PAGO_LABEL = {
  PENDIENTE: "Pendiente de verificación",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  REEMBOLSADO: "Reembolsado",
};

const ESTADO_PAGO_BADGE = {
  PENDIENTE: "bg-amber-50 text-amber-700 ring-amber-200",
  APROBADO: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  RECHAZADO: "bg-red-50 text-red-700 ring-red-200",
  REEMBOLSADO: "bg-slate-100 text-slate-600 ring-slate-200",
};

const formatearFecha = (fecha) => {
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

const formatearFechaHora = (fecha) => {
  if (!fecha) return "";
  try {
    return new Date(fecha).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(fecha);
  }
};

const OwnerReservations = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [canchas, setCanchas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [filtros, setFiltros] = useState({
    id_cancha: searchParams.get("cancha") || "",
    estado: searchParams.get("estado") || "",
    estado_pago: searchParams.get("estado_pago") || "",
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(null);

  useEffect(() => {
    const cargarCanchas = async () => {
      try {
        const { data } = await api.get("/courts/mine");
        setCanchas(data?.data?.canchas || []);
      } catch (e) {
        setError(getApiError(e));
      }
    };
    cargarCanchas();
  }, []);

  const cargarReservas = async () => {
    setCargando(true);
    setError("");
    try {
      const params = {};
      if (filtros.id_cancha) params.id_cancha = filtros.id_cancha;
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.estado_pago) params.estado_pago = filtros.estado_pago;
      const { data } = await getReservations(params);
      setReservas(data?.data?.reservas || []);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, [filtros.id_cancha, filtros.estado, filtros.estado_pago]);

  const actualizarFiltro = (campo, valor) => {
    const siguientes = { ...filtros, [campo]: valor };
    setFiltros(siguientes);
    setMensaje("");
    const params = {};
    if (siguientes.id_cancha) params.cancha = siguientes.id_cancha;
    if (siguientes.estado) params.estado = siguientes.estado;
    if (siguientes.estado_pago) params.estado_pago = siguientes.estado_pago;
    setSearchParams(params, { replace: true });
  };

  const limpiarFiltros = () => {
    setFiltros({ id_cancha: "", estado: "", estado_pago: "" });
    setMensaje("");
    setSearchParams({}, { replace: true });
  };

  const resumen = useMemo(() => {
    const pagosPendientes = reservas.reduce(
      (total, reserva) =>
        total + (reserva.pagos || []).filter((pago) => pago.estado === "PENDIENTE").length,
      0
    );
    return {
      total: reservas.length,
      confirmadas: reservas.filter((reserva) => reserva.estado === "CONFIRMADA").length,
      pendientes: reservas.filter((reserva) => reserva.estado === "PENDIENTE").length,
      pagosPendientes,
    };
  }, [reservas]);

  const handleVerificar = async (pago, accion) => {
    if (
      accion === "RECHAZAR" &&
      !window.confirm(
        `¿Rechazar el pago #${pago.id_pago} de Bs. ${Number(pago.monto).toFixed(2)}?`
      )
    ) {
      return;
    }

    setProcesando(pago.id_pago);
    setError("");
    setMensaje("");
    try {
      await verifyPayment(pago.id_pago, { accion });
      setMensaje(
        accion === "APROBAR"
          ? "Pago aprobado. La reserva quedó confirmada automáticamente y ya se puede organizar un partido."
          : "Pago rechazado correctamente. La reserva continúa pendiente de un pago válido."
      );
      await cargarReservas();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">PANEL DEL PROPIETARIO</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Reservas de mis canchas
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Consulta los estados de reservas y pagos, revisa comprobantes y confirma los pagos
            recibidos.
          </p>
        </div>
        <Link
          to="/courts"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <MapPinned size={16} />
          Mis canchas
        </Link>
      </header>

      {error ? (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {mensaje ? (
        <div className="mb-5">
          <Alert tipo="exito">{mensaje}</Alert>
        </div>
      ) : null}

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Filter size={16} className="text-slate-500" />
          Filtros
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Cancha
            </span>
            <select
              value={filtros.id_cancha}
              onChange={(e) => actualizarFiltro("id_cancha", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Todas mis canchas</option>
              {canchas.map((cancha) => (
                <option key={cancha.id_cancha} value={cancha.id_cancha}>
                  {cancha.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Estado de reserva
            </span>
            <select
              value={filtros.estado}
              onChange={(e) => actualizarFiltro("estado", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Todos</option>
              {Object.entries(ESTADO_RESERVA_LABEL).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Estado de pago
            </span>
            <select
              value={filtros.estado_pago}
              onChange={(e) => actualizarFiltro("estado_pago", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Todos</option>
              {Object.entries(ESTADO_PAGO_LABEL).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
              <option value="SIN_PAGO">Sin pagos registrados</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { etiqueta: "Reservas encontradas", valor: resumen.total, Icono: CalendarDays },
          { etiqueta: "Confirmadas", valor: resumen.confirmadas, Icono: CheckCircle2 },
          { etiqueta: "Pendientes de pago", valor: resumen.pendientes, Icono: Clock },
          { etiqueta: "Pagos por verificar", valor: resumen.pagosPendientes, Icono: CreditCard },
        ].map(({ etiqueta, valor, Icono }) => (
          <div
            key={etiqueta}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Icono size={15} />
              {etiqueta}
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{valor}</p>
          </div>
        ))}
      </section>

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner /> Cargando reservas...
        </div>
      ) : reservas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <Search className="mx-auto text-slate-400" size={26} />
          <p className="mt-3 text-sm font-medium text-slate-800">
            No se encontraron reservas con los filtros seleccionados
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Las reservas aparecen aquí cuando un jugador solicita uno de los horarios de tus canchas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservas.map((reserva) => {
            const pagos = reserva.pagos || [];
            return (
              <article
                key={reserva.id_reserva}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">
                        Reserva #{reserva.id_reserva}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                          ESTADO_RESERVA_BADGE[reserva.estado] || "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        {ESTADO_RESERVA_LABEL[reserva.estado] || reserva.estado}
                      </span>
                      {reserva.partido ? (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                          Partido: {reserva.partido.nombre}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-700">
                      <MapPinned size={15} className="shrink-0 text-slate-400" />
                      <span className="font-medium">{reserva.cancha?.nombre}</span>
                      <span className="text-slate-400">·</span>
                      <span className="capitalize">{reserva.cancha?.deporte}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{reserva.cancha?.ubicacion}</p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Monto total</p>
                    <p className="mt-1 text-xl font-bold text-emerald-800">
                      Bs. {Number(reserva.monto_total || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 bg-slate-50/60 px-5 py-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="shrink-0 text-slate-400" />
                    <span>{formatearFecha(reserva.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="shrink-0 text-slate-400" />
                    <span>
                      {reserva.hora_inicio} - {reserva.hora_fin}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserRound size={16} className="shrink-0 text-slate-400" />
                    <span>
                      {reserva.usuario
                        ? `${reserva.usuario.nombre} ${reserva.usuario.apellido}`
                        : "Jugador"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="shrink-0 text-slate-400" />
                    <span className="truncate">{reserva.usuario?.correo || "Sin correo"}</span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CreditCard size={16} className="text-slate-500" />
                    Pagos y comprobantes
                  </div>

                  {pagos.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-inset ring-slate-200">
                      El jugador todavía no registró ningún pago para esta reserva.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {pagos.map((pago) => (
                        <li
                          key={pago.id_pago}
                          className="flex flex-col gap-3 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {pago.metodo_pago || "Pago"} · Bs.{" "}
                                {Number(pago.monto || 0).toFixed(2)}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                  ESTADO_PAGO_BADGE[pago.estado] ||
                                  "bg-slate-100 text-slate-600 ring-slate-200"
                                }`}
                              >
                                {ESTADO_PAGO_LABEL[pago.estado] || pago.estado}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              Registrado el {formatearFechaHora(pago.fecha_pago)}
                              {pago.referencia ? ` · Referencia: ${pago.referencia}` : ""}
                            </p>
                            {pago.fecha_verificacion ? (
                              <p className="mt-0.5 text-xs text-slate-500">
                                Verificado el {formatearFechaHora(pago.fecha_verificacion)}
                              </p>
                            ) : null}
                            {pago.comprobante_url ? (
                              <a
                                href={pago.comprobante_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                              >
                                <ExternalLink size={13} />
                                Ver comprobante / referencia de pago
                              </a>
                            ) : (
                              <p className="mt-1.5 text-xs text-slate-400">
                                Sin comprobante adjunto
                              </p>
                            )}
                          </div>

                          {pago.estado === "PENDIENTE" ? (
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleVerificar(pago, "APROBAR")}
                                disabled={procesando === pago.id_pago}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                              >
                                {procesando === pago.id_pago ? (
                                  <Spinner className="h-3.5 w-3.5" />
                                ) : (
                                  <CheckCircle2 size={14} />
                                )}
                                Aprobar y confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVerificar(pago, "RECHAZAR")}
                                disabled={procesando === pago.id_pago}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                              >
                                <XCircle size={14} />
                                Rechazar
                              </button>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}

                  {reserva.estado === "CONFIRMADA" ? (
                    <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-200">
                      <BadgeCheck size={16} className="mt-0.5 shrink-0" />
                      Reserva confirmada: el jugador ya puede organizar un partido con esta reserva.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OwnerReservations;

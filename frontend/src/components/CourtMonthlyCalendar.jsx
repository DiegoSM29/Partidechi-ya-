import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "./Alert";
import Spinner from "./Spinner";

const fechaLocal = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
};

const mesInicial = (fecha) => fecha?.slice(0, 7) || fechaLocal().slice(0, 7);

const mesSiguiente = (mes, incremento) => {
  const [year, month] = mes.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + incremento, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const nombreMes = (mes) => {
  const [year, month] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

const ESTADOS = {
  DISPONIBLE: {
    etiqueta: "Disponible",
    detalle: "Hay horarios disponibles",
    clases: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  CERRADA: {
    etiqueta: "Cerrada",
    detalle: "La cancha está cerrada este día",
    clases: "border-red-200 bg-red-50 text-red-800",
  },
  SIN_HORARIO: {
    etiqueta: "Sin horario semanal",
    detalle: "No hay horario semanal configurado para este día",
    clases: "border-slate-200 bg-slate-50 text-slate-600",
  },
  SIN_TURNOS: {
    etiqueta: "Sin horarios libres",
    detalle: "No hay horarios disponibles este día",
    clases: "border-amber-200 bg-amber-50 text-amber-800",
  },
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const CourtMonthlyCalendar = ({
  idCancha,
  fechaSeleccionada,
  onSeleccionarFecha,
  refreshKey = 0,
}) => {
  const [mes, setMes] = useState(() => mesInicial(fechaSeleccionada));
  const [dias, setDias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError("");
    api.get(`/courts/${idCancha}/calendar`, { params: { mes } })
      .then(({ data }) => {
        if (activo) setDias(data?.data?.dias || []);
      })
      .catch((e) => {
        if (activo) setError(getApiError(e));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [idCancha, mes, refreshKey]);

  const [year, month] = mes.split("-").map(Number);
  const espaciosIniciales = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setMes((actual) => mesSiguiente(actual, -1))}
          aria-label="Ver mes anterior"
          className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-center text-base font-semibold capitalize text-slate-950">
          {nombreMes(mes)}
        </h2>
        <button
          type="button"
          onClick={() => setMes((actual) => mesSiguiente(actual, 1))}
          aria-label="Ver mes siguiente"
          className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Spinner /> Consultando el mes...
        </div>
      ) : error ? null : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500 sm:gap-2 sm:text-xs">
            {DIAS.map((dia) => <span key={dia} className="py-1">{dia}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: espaciosIniciales }, (_, index) => (
              <span key={`espacio-${index}`} aria-hidden="true" />
            ))}
            {dias.map((dia) => {
              const estado = ESTADOS[dia.estado] || ESTADOS.SIN_HORARIO;
              const seleccionado = fechaSeleccionada === dia.fecha;
              const fechaPasada = dia.fecha < fechaLocal();
              return (
                <button
                  key={dia.fecha}
                  type="button"
                  onClick={() => onSeleccionarFecha?.(dia.fecha)}
                  aria-pressed={seleccionado}
                  title={`${estado.detalle}${dia.turnos_totales > 0 ? ` (${dia.turnos_disponibles} de ${dia.turnos_totales} turnos disponibles)` : ""}${fechaPasada ? ". Fecha pasada, no se puede reservar." : ""}`}
                  className={`flex min-h-[4.75rem] flex-col items-center justify-center rounded-lg border px-0.5 py-1 text-center transition sm:min-h-20 sm:px-2 ${
                    estado.clases
                  } ${fechaPasada ? "opacity-60" : ""} ${seleccionado ? "ring-2 ring-emerald-700 ring-offset-1" : "hover:brightness-95"}`}
                >
                  <span className="text-sm font-bold">{Number(dia.fecha.slice(-2))}</span>
                  <span className="mt-1 text-[8px] font-semibold leading-tight sm:text-[11px]">
                    {estado.etiqueta}
                  </span>
                  {dia.turnos_totales > 0 ? (
                    <span className="mt-0.5 text-[8px] leading-tight sm:text-[10px]">
                      {dia.turnos_disponibles}/{dia.turnos_totales}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-600 sm:text-xs">
            {Object.entries(ESTADOS).map(([estado, detalle]) => (
              <span key={estado} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm border ${detalle.clases}`} />
                {detalle.etiqueta}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default CourtMonthlyCalendar;

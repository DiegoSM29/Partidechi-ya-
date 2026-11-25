import { useEffect, useMemo, useState } from "react";
import { CalendarX, Check, Clock, ListChecks } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

const fechaLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const CourtClosures = () => {
  const [canchas, setCanchas] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [fecha, setFecha] = useState(fechaLocal);
  const [revision, setRevision] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    api.get("/courts/mine")
      .then(({ data }) => setCanchas(data?.data?.canchas || []))
      .catch((e) => setError(getApiError(e)))
      .finally(() => setCargando(false));
  }, []);

  const todasSeleccionadas = canchas.length > 0 && seleccionadas.length === canchas.length;
  const nombresSeleccionados = useMemo(
    () => canchas.filter((cancha) => seleccionadas.includes(cancha.id_cancha)),
    [canchas, seleccionadas]
  );

  const cambiarFecha = (value) => {
    setFecha(value);
    setRevision(null);
    setMensaje("");
  };

  const cambiarCancha = (id_cancha) => {
    setSeleccionadas((actuales) =>
      actuales.includes(id_cancha)
        ? actuales.filter((id) => id !== id_cancha)
        : [...actuales, id_cancha]
    );
    setRevision(null);
    setMensaje("");
  };

  const cambiarTodas = () => {
    setSeleccionadas(todasSeleccionadas ? [] : canchas.map((cancha) => cancha.id_cancha));
    setRevision(null);
    setMensaje("");
  };

  const revisarCierre = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");
    if (!fecha || seleccionadas.length === 0) {
      setError("Selecciona una fecha y al menos una cancha.");
      return;
    }
    setProcesando(true);
    try {
      const { data } = await api.post("/courts/closures/preview", {
        fecha,
        id_canchas: seleccionadas,
      });
      setRevision(data?.data || null);
    } catch (e) {
      setError(getApiError(e));
      setRevision(null);
    } finally {
      setProcesando(false);
    }
  };

  const confirmarCierre = async () => {
    if (!revision) return;
    setError("");
    setMensaje("");
    setProcesando(true);
    try {
      const { data } = await api.post("/courts/closures", {
        fecha: revision.fecha,
        id_canchas: revision.canchas.map((cancha) => cancha.id_cancha),
        reservas_revision: revision.reservas_revision,
      });
      setMensaje(
        `Cierre aplicado para ${data.data.canchas.length} ${data.data.canchas.length === 1 ? "cancha" : "canchas"}; ${data.data.reservas_canceladas} ${data.data.reservas_canceladas === 1 ? "reserva cancelada" : "reservas canceladas"}.`
      );
      setSeleccionadas([]);
      setRevision(null);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <header className="mb-7 border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-emerald-700">PANEL DEL PROPIETARIO</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-950">
          <CalendarX size={28} className="text-emerald-700" />
          Cerrar canchas
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Cierra una o varias canchas solo para una fecha, sin cambiar sus horarios semanales.
        </p>
      </header>

      {error ? <div className="mb-5"><Alert>{error}</Alert></div> : null}
      {mensaje ? (
        <div role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {mensaje}
        </div>
      ) : null}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner /> Cargando tus canchas...
        </div>
      ) : canchas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-5 py-14 text-center text-sm text-slate-600">
          Registra una cancha para poder crear cierres.
        </div>
      ) : (
        <form onSubmit={revisarCierre} className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label htmlFor="fecha-cierre" className="block text-sm font-semibold text-slate-800">
              Fecha del cierre
            </label>
            <input
              id="fecha-cierre"
              type="date"
              min={fechaLocal()}
              required
              value={fecha}
              onChange={(event) => cambiarFecha(event.target.value)}
              className="mt-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-2 text-xs text-slate-500">No se permiten fechas pasadas.</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">Canchas del propietario</h2>
              <button
                type="button"
                onClick={cambiarTodas}
                className="text-sm font-semibold text-emerald-800 hover:text-emerald-950"
              >
                {todasSeleccionadas ? "Quitar todas" : "Cerrar todas las canchas"}
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {canchas.map((cancha) => (
                <li key={cancha.id_cancha}>
                  <label className="flex cursor-pointer items-center gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={seleccionadas.includes(cancha.id_cancha)}
                      onChange={() => cambiarCancha(cancha.id_cancha)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-900">{cancha.nombre}</span>
                      <span className="text-xs text-slate-500">{cancha.deporte} · {cancha.ubicacion}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <button
            type="submit"
            disabled={procesando || seleccionadas.length === 0 || !fecha}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {procesando ? <Spinner /> : <ListChecks size={17} />}
            Revisar reservas afectadas
          </button>
        </form>
      )}

      {revision ? (
        <section aria-labelledby="revision-cierre" className="mt-7 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
          <h2 id="revision-cierre" className="text-lg font-semibold text-slate-950">
            Confirma el cierre para {revision.fecha}
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Se cerrarán estas canchas. Las reservas pendientes y confirmadas se cancelarán; los pagos asociados no se modificarán.
          </p>
          <ul className="mt-4 space-y-3">
            {revision.canchas.map((cancha) => (
              <li key={cancha.id_cancha} className="rounded-lg border border-amber-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">{cancha.nombre}</h3>
                {cancha.reservas.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">Sin reservas pendientes o confirmadas.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {cancha.reservas.map((reserva) => (
                      <li key={reserva.id_reserva} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
                        <Clock size={15} className="text-amber-700" />
                        <span>{reserva.hora_inicio}–{reserva.hora_fin}</span>
                        <span>{reserva.jugador}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {reserva.estado === "PENDIENTE" ? "Pendiente" : "Confirmada"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium text-slate-800">
            {revision.reservas_afectadas} {revision.reservas_afectadas === 1 ? "reserva será cancelada" : "reservas serán canceladas"}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={confirmarCierre}
              disabled={procesando}
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
            >
              {procesando ? <Spinner /> : <Check size={17} />}
              Confirmar y cerrar canchas
            </button>
            <button
              type="button"
              onClick={() => setRevision(null)}
              disabled={procesando}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver a editar
            </button>
          </div>
        </section>
      ) : null}

      {nombresSeleccionados.length > 0 ? (
        <p className="sr-only" aria-live="polite">
          {nombresSeleccionados.length} canchas seleccionadas.
        </p>
      ) : null}
    </div>
  );
};

export default CourtClosures;

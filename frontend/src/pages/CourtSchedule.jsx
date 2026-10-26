import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, Plus, Save, Trash2 } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { Campo, inputCls } from "../components/FormFields";

const DIAS = [
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

const NOMBRE_DIA = Object.fromEntries(DIAS.map((dia) => [dia.value, dia.label]));

const hoyLocal = () => {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const FORM_VACIO = {
  dia_semana: "1",
  hora_inicio: "08:00",
  hora_fin: "22:00",
};

const CourtSchedule = () => {
  const { id } = useParams();
  const [cancha, setCancha] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [horariosPendientes, setHorariosPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [form, setForm] = useState(FORM_VACIO);
  const [fecha, setFecha] = useState(hoyLocal);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const [misCanchas, horariosResp] = await Promise.all([
          api.get("/courts/mine"),
          api.get(`/courts/${id}/schedules`),
        ]);
        const encontrada = misCanchas.data.data.canchas.find(
          (item) => String(item.id_cancha) === String(id)
        );
        if (!encontrada) {
          setError("Cancha no encontrada o no tienes permiso para administrarla.");
          return;
        }
        if (activo) {
          setCancha(encontrada);
          setHorarios(horariosResp.data.data.horarios);
        }
      } catch (e) {
        if (activo) setError(getApiError(e));
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [id]);

  useEffect(() => {
    if (!cancha || !fecha) return undefined;
    let activo = true;
    setCargandoDisponibilidad(true);
    api
      .get(`/courts/${id}/availability`, { params: { fecha } })
      .then(({ data }) => {
        if (activo) setDisponibilidad(data.data);
      })
      .catch((e) => {
        if (activo) setError(getApiError(e));
      })
      .finally(() => {
        if (activo) setCargandoDisponibilidad(false);
      });
    return () => {
      activo = false;
    };
  }, [id, cancha, fecha, revision]);

  const recargarHorarios = async () => {
    const { data } = await api.get(`/courts/${id}/schedules`);
    setHorarios(data.data.horarios);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({ ...actual, [name]: value }));
    setError("");
    setExito("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setExito("");
    if (!form.hora_inicio || !form.hora_fin) {
      setError("Indica la hora de inicio y la hora de fin.");
      return;
    }
    if (form.hora_inicio >= form.hora_fin) {
      setError("La hora de inicio debe ser anterior a la hora de fin.");
      return;
    }

    setHorariosPendientes((actuales) => [
      ...actuales,
      {
        id_local: crypto.randomUUID(),
        dia_semana: Number(form.dia_semana),
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        pendiente: true,
      },
    ]);
    setExito("Horario agregado a la lista. Presiona “Guardar horarios” para registrarlo.");
  };

  const guardarHorarios = async () => {
    if (horariosPendientes.length === 0) return;

    setGuardando(true);
    setError("");
    setExito("");
    try {
      await api.post(
        `/courts/${id}/schedules`,
        horariosPendientes.map(({ dia_semana, hora_inicio, hora_fin }) => ({
          dia_semana,
          hora_inicio,
          hora_fin,
        }))
      );
      setHorariosPendientes([]);
      await recargarHorarios();
      setRevision((valor) => valor + 1);
      setExito("Horarios guardados correctamente. Las demás horas no estarán disponibles para reservar.");
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setGuardando(false);
    }
  };

  const quitarHorarioPendiente = (idLocal) => {
    setHorariosPendientes((actuales) =>
      actuales.filter((franja) => franja.id_local !== idLocal)
    );
  };

  const eliminarFranja = async (franja) => {
    const pregunta = `¿Eliminar el horario del ${NOMBRE_DIA[String(franja.dia_semana)]} de ${franja.hora_inicio} a ${franja.hora_fin}?`;
    if (!window.confirm(pregunta)) return;

    setError("");
    setExito("");
    setEliminando(franja.id_horario);
    try {
      await api.delete(`/courts/${id}/schedules/${franja.id_horario}`);
      await recargarHorarios();
      setRevision((valor) => valor + 1);
      setExito("Horario eliminado correctamente. Esa franja ya no estará disponible para reservar.");
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setEliminando(null);
    }
  };

  const agrupados = useMemo(() => {
    const resultado = Object.fromEntries(
      DIAS.map((dia) => [dia.value, []])
    );
    for (const franja of [...horarios, ...horariosPendientes]) {
      const grupo = resultado[String(franja.dia_semana)];
      if (!grupo) continue;
      grupo.push(franja);
    }
    return resultado;
  }, [horarios, horariosPendientes]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Link
        to="/courts"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft size={16} /> Volver a mis canchas
      </Link>

      <div className="mb-6 border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-emerald-700">PANEL DEL PROPIETARIO</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Horarios y disponibilidad
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {cancha ? `${cancha.nombre} · ${cancha.ubicacion}` : "Configura cuándo se puede reservar tu cancha."}
        </p>
      </div>

      {error ? <div className="mb-5"><Alert>{error}</Alert></div> : null}
      {exito ? <div className="mb-5"><Alert tipo="exito">{exito}</Alert></div> : null}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner /> Cargando horarios...
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
              <Clock size={18} className="text-emerald-700" /> Configurar franja
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Registra las franjas que se pueden reservar. Las horas que no registres no estarán disponibles.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <Campo id="schedule-day" etiqueta="Día de la semana">
                <select
                  id="schedule-day"
                  name="dia_semana"
                  value={form.dia_semana}
                  onChange={handleChange}
                  className={inputCls(false)}
                >
                  {DIAS.map((dia) => (
                    <option key={dia.value} value={dia.value}>{dia.label}</option>
                  ))}
                </select>
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo id="schedule-start" etiqueta="Hora inicio">
                  <input
                    id="schedule-start"
                    name="hora_inicio"
                    type="time"
                    required
                    value={form.hora_inicio}
                    onChange={handleChange}
                    className={inputCls(false)}
                  />
                </Campo>
                <Campo id="schedule-end" etiqueta="Hora fin">
                  <input
                    id="schedule-end"
                    name="hora_fin"
                    type="time"
                    required
                    value={form.hora_fin}
                    onChange={handleChange}
                    className={inputCls(false)}
                  />
                </Campo>
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} />
                Agregar a la lista
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                <CalendarDays size={18} className="text-emerald-700" /> Horarios registrados y pendientes
              </h2>
              <p className="text-xs font-medium text-slate-500">
                {horarios.length} guardados
                {horariosPendientes.length > 0 ? ` · ${horariosPendientes.length} por guardar` : ""}
              </p>
            </div>

            {horarios.length === 0 && horariosPendientes.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                Aún no hay horarios configurados. Agrega al menos una franja de funcionamiento para habilitar reservas.
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {DIAS.map((dia) => {
                  const grupo = agrupados[dia.value];
                  if (grupo.length === 0) return null;
                  return (
                    <li key={dia.value} className="py-3">
                      <p className="text-sm font-semibold text-slate-900">{dia.label}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {grupo.map((franja) => (
                          <span
                            key={franja.id_horario ?? franja.id_local}
                            className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1 text-xs font-medium ${
                              franja.pendiente
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            {franja.hora_inicio} - {franja.hora_fin}{franja.pendiente ? " · por guardar" : ""}
                            <button
                              type="button"
                              onClick={() =>
                                franja.pendiente
                                  ? quitarHorarioPendiente(franja.id_local)
                                  : eliminarFranja(franja)
                              }
                              disabled={!franja.pendiente && eliminando === franja.id_horario}
                              aria-label={`${franja.pendiente ? "Quitar" : "Eliminar"} horario ${franja.hora_inicio} a ${franja.hora_fin} del ${dia.label}`}
                              className="rounded-full p-1 hover:bg-white/70 disabled:opacity-50"
                            >
                              {!franja.pendiente && eliminando === franja.id_horario
                                ? <Spinner className="h-3 w-3" />
                                : <Trash2 size={12} />}
                            </button>
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={guardarHorarios}
              disabled={guardando || horariosPendientes.length === 0}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? <Spinner className="h-4 w-4 text-white" /> : <Save size={16} />}
              {guardando ? "Guardando horarios..." : "Guardar horarios"}
            </button>
          </section>
        </div>
      )}

      {cancha ? (
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                <CalendarDays size={18} className="text-emerald-700" /> Disponibilidad resultante
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Consulta las franjas registradas y las reservas ya realizadas.
              </p>
            </div>
            <div className="w-full sm:w-52">
              <Campo id="availability-date" etiqueta="Fecha">
                <input
                  id="availability-date"
                  type="date"
                  value={fecha}
                  onChange={(event) => setFecha(event.target.value)}
                  className={inputCls(false)}
                />
              </Campo>
            </div>
          </div>

          {cargandoDisponibilidad ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Spinner /> Consultando disponibilidad...
            </div>
          ) : disponibilidad ? (
            <>
              <p className="mt-4 text-sm text-slate-600">
                {disponibilidad.dia} {disponibilidad.fecha}: {disponibilidad.slots.filter((slot) => slot.disponible).length} de {disponibilidad.slots.length} turnos disponibles.
              </p>
              {disponibilidad.slots.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  No hay turnos para esta fecha porque no existe un horario de funcionamiento configurado para {disponibilidad.dia}.
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {disponibilidad.slots.map((slot) => (
                    <div
                      key={`${slot.hora_inicio}-${slot.hora_fin}`}
                      className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold ${
                        slot.disponible
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {slot.hora_inicio} - {slot.hora_fin}
                      <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide opacity-80">
                        {slot.disponible ? "Disponible" : "Reservado"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};

export default CourtSchedule;

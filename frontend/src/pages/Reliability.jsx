import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BadgeCheck, History, ShieldCheck } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";

const fecha = (value) =>
  new Date(value).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });

const labels = {
  INASISTENCIA: "Inasistencia validada",
  CIERRE_CANCHA: "Cierre de cancha",
  CANCELACION_PARTIDO: "Cancelación de partido",
  ABANDONO_PARTIDO: "Abandono de partido",
  AJUSTE_ADMIN: "Ajuste administrativo",
};

const textoRestricciones = (rol, puntaje, nivel) => {
  if (nivel === "ADVERTENCIA") return "Advertencia: mantienes tus acciones.";
  if (nivel === "SIN_RESTRICCIONES" || nivel === "ADMINISTRACION") {
    return "Sin restricciones por puntaje.";
  }
  if (rol === "JUGADOR") {
    if (puntaje === 0) return "No puedes reservar ni unirte a partidos; solicita revisión administrativa.";
    if (puntaje < 40) return "No puedes unirte a partidos ni crear reservas.";
    return "No puedes unirte a partidos; puedes seguir creando reservas.";
  }
  if (puntaje === 0) {
    return "No puedes registrar canchas ni publicar disponibilidad; solicita revisión administrativa.";
  }
  if (puntaje < 40) return "No puedes registrar canchas ni publicar disponibilidad nueva.";
  return "No puedes registrar canchas; puedes administrar las existentes.";
};

const Reliability = () => {
  const { user } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [revisiones, setRevisiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [revisionActiva, setRevisionActiva] = useState(null);
  const [motivoRevision, setMotivoRevision] = useState("");
  const [decisionReporte, setDecisionReporte] = useState({});
  const [decisionRevision, setDecisionRevision] = useState({});
  const [ajuste, setAjuste] = useState({ id_usuario: "", puntaje: "", motivo: "" });
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/reliability");
      setResumen(data.data);
      if (user.rol === "ADMINISTRADOR") {
        const [reportesResp, revisionesResp] = await Promise.all([
          api.get("/reliability/admin/reports"),
          api.get("/reliability/admin/reviews"),
        ]);
        setReportes(reportesResp.data.data.reportes);
        setRevisiones(revisionesResp.data.data.revisiones);
      }
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setCargando(false);
    }
  }, [user.rol]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const solicitarRevision = async (event) => {
    event.preventDefault();
    setProcesando(true);
    setError("");
    try {
      await api.post(`/reliability/history/${revisionActiva}/reviews`, {
        motivo: motivoRevision,
      });
      setRevisionActiva(null);
      setMotivoRevision("");
      setExito("Solicitud enviada. Un administrador revisará el descuento.");
      await cargar();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setProcesando(false);
    }
  };

  const resolverReporte = async (reporte, estado) => {
    const decision = decisionReporte[reporte.id_reporte] || "";
    setProcesando(true);
    setError("");
    try {
      await api.patch(`/reliability/admin/reports/${reporte.id_reporte}`, { estado, decision });
      setExito("Reporte resuelto.");
      await cargar();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setProcesando(false);
    }
  };

  const resolverRevision = async (revision, estado) => {
    const decision = decisionRevision[revision.id_revision] || "";
    setProcesando(true);
    setError("");
    try {
      await api.patch(`/reliability/admin/reviews/${revision.id_revision}`, { estado, decision });
      setExito("Revisión resuelta.");
      await cargar();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setProcesando(false);
    }
  };

  const corregirPuntaje = async (event) => {
    event.preventDefault();
    setProcesando(true);
    setError("");
    try {
      await api.patch(`/reliability/admin/users/${ajuste.id_usuario}/score`, {
        puntaje: Number(ajuste.puntaje),
        motivo: ajuste.motivo,
      });
      setAjuste({ id_usuario: "", puntaje: "", motivo: "" });
      setExito("Puntaje actualizado y registrado en el historial.");
      await cargar();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  return (
    <div className="mt-6 space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
          <ShieldCheck className="text-emerald-700" />
          Puntaje de confiabilidad
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Consulta tu puntaje, las acciones que lo modificaron y los permisos asociados.
        </p>
      </header>
      {error ? <Alert tipo="error">{error}</Alert> : null}
      {exito ? <Alert tipo="success">{exito}</Alert> : null}

      {resumen ? (
        <>
          <section className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
              <span className="text-3xl font-bold">{resumen.puntaje}</span>
              <span className="text-xs font-semibold">de 100</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Tus permisos actuales</h2>
              <p className="mt-1 text-sm text-slate-700">
                {textoRestricciones(
                  user.rol,
                  resumen.puntaje,
                  resumen.restricciones?.nivel
                )}
              </p>
              {resumen.restricciones?.advertencia ? (
                <p className="mt-2 text-sm text-amber-700">Estás en el rango de advertencia.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <History size={18} />
              Historial de puntaje
            </h2>
            {resumen.historial.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no tienes variaciones registradas.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {resumen.historial.map((item) => {
                  const revision = item.revisiones?.[0];
                  return (
                    <li key={item.id_movimiento} className="py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-medium text-slate-900">{labels[item.tipo] || item.tipo}</h3>
                        <span className={`font-semibold ${item.puntos_delta < 0 ? "text-red-700" : "text-emerald-700"}`}>
                          {item.puntos_delta > 0 ? "+" : ""}{item.puntos_delta}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{item.motivo}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {fecha(item.fecha_creacion)} · {item.puntaje_anterior} → {item.puntaje_resultante} puntos
                        {item.partido ? ` · ${item.partido.nombre}` : ""}
                      </p>
                      {item.puntos_delta < 0 && !revisionActiva && !revision ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRevisionActiva(item.id_movimiento);
                            setMotivoRevision("");
                          }}
                          className="mt-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          Solicitar revisión
                        </button>
                      ) : null}
                      {revision ? (
                        <p className="mt-2 text-xs text-slate-500">Revisión: {revision.estado.toLowerCase()}{revision.decision ? ` · ${revision.decision}` : ""}</p>
                      ) : null}
                      {revisionActiva === item.id_movimiento ? (
                        <form onSubmit={solicitarRevision} className="mt-3 space-y-2">
                          <label className="block text-sm text-slate-600">
                            Explica por qué solicitas la revisión
                            <textarea
                              value={motivoRevision}
                              onChange={(event) => setMotivoRevision(event.target.value)}
                              required
                              maxLength={500}
                              rows={2}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                            />
                          </label>
                          <div className="flex gap-2">
                            <button disabled={procesando} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Enviar solicitud</button>
                            <button type="button" onClick={() => setRevisionActiva(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancelar</button>
                          </div>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {user.rol === "ADMINISTRADOR" ? (
        <section className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <AlertCircle size={18} /> Reportes de inasistencia
            </h2>
            {reportes.filter((item) => item.estado === "PENDIENTE").length === 0 ? (
              <p className="text-sm text-slate-500">No hay reportes pendientes.</p>
            ) : reportes.filter((item) => item.estado === "PENDIENTE").map((item) => (
              <article key={item.id_reporte} className="border-t border-slate-100 py-4">
                <p className="font-medium">{item.jugador.nombre} {item.jugador.apellido} · {item.partido.nombre}</p>
                <p className="mt-1 text-sm text-slate-600">Organizador: {item.organizador.nombre} {item.organizador.apellido} · {item.motivo}</p>
                <label className="mt-3 block text-sm text-slate-600">
                  Decisión y motivo
                  <textarea
                    value={decisionReporte[item.id_reporte] || ""}
                    onChange={(event) => setDecisionReporte((actual) => ({ ...actual, [item.id_reporte]: event.target.value }))}
                    maxLength={500}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <div className="mt-2 flex gap-2">
                  <button disabled={procesando || !decisionReporte[item.id_reporte]?.trim()} onClick={() => resolverReporte(item, "VALIDADO")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Validar (hasta -20)</button>
                  <button disabled={procesando || !decisionReporte[item.id_reporte]?.trim()} onClick={() => resolverReporte(item, "RECHAZADO")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Rechazar</button>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BadgeCheck size={18} /> Solicitudes de revisión
            </h2>
            {revisiones.filter((item) => item.estado === "PENDIENTE").length === 0 ? (
              <p className="text-sm text-slate-500">No hay solicitudes pendientes.</p>
            ) : revisiones.filter((item) => item.estado === "PENDIENTE").map((item) => (
              <article key={item.id_revision} className="border-t border-slate-100 py-4">
                <p className="font-medium">{item.solicitante.nombre} {item.solicitante.apellido} · {item.movimiento.motivo}</p>
                <p className="mt-1 text-sm text-slate-600">Solicitud: {item.motivo} · Descuento: {item.movimiento.puntos_delta} puntos</p>
                <label className="mt-3 block text-sm text-slate-600">
                  Decisión y motivo
                  <textarea
                    value={decisionRevision[item.id_revision] || ""}
                    onChange={(event) => setDecisionRevision((actual) => ({ ...actual, [item.id_revision]: event.target.value }))}
                    maxLength={500}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <div className="mt-2 flex gap-2">
                  <button disabled={procesando || !decisionRevision[item.id_revision]?.trim()} onClick={() => resolverRevision(item, "ACEPTADA")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Aceptar y revertir</button>
                  <button disabled={procesando || !decisionRevision[item.id_revision]?.trim()} onClick={() => resolverRevision(item, "RECHAZADA")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Rechazar</button>
                </div>
              </article>
            ))}
          </div>

          <form onSubmit={corregirPuntaje} className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Corrección administrativa</h2>
            <p className="text-sm text-slate-600">El ajuste queda registrado en el historial y notificado al usuario.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input aria-label="ID del usuario" required type="number" min="1" value={ajuste.id_usuario} onChange={(event) => setAjuste({ ...ajuste, id_usuario: event.target.value })} placeholder="ID de usuario" className="rounded-lg border border-slate-300 px-3 py-2" />
              <input aria-label="Puntaje nuevo" required type="number" min="0" max="100" value={ajuste.puntaje} onChange={(event) => setAjuste({ ...ajuste, puntaje: event.target.value })} placeholder="Puntaje entre 0 y 100" className="rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <textarea required maxLength={500} value={ajuste.motivo} onChange={(event) => setAjuste({ ...ajuste, motivo: event.target.value })} placeholder="Motivo de la corrección" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            <button disabled={procesando} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Guardar corrección</button>
          </form>
        </section>
      ) : null}
    </div>
  );
};

export default Reliability;

import { useEffect, useState } from "react";
import { Bell, Check, Clock } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

const Notifications = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(null);

  const cargar = async () => {
    setError("");
    try {
      const { data } = await api.get("/notifications");
      setNotificaciones(data?.data?.notificaciones || []);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const marcarLeida = async (notificacion) => {
    setProcesando(notificacion.id_notificacion);
    setError("");
    try {
      await api.patch(`/notifications/${notificacion.id_notificacion}/read`);
      setNotificaciones((actuales) =>
        actuales.map((item) =>
          item.id_notificacion === notificacion.id_notificacion
            ? { ...item, leida: true }
            : item
        )
      );
      window.dispatchEvent(new Event("notifications:updated"));
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <header className="mb-7 border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-emerald-700">TU CUENTA</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-950">
          <Bell size={27} className="text-emerald-700" />
          Notificaciones
        </h1>
      </header>
      {error ? <div className="mb-5"><Alert>{error}</Alert></div> : null}
      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner /> Cargando notificaciones...
        </div>
      ) : notificaciones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-5 py-14 text-center">
          <Bell className="mx-auto text-slate-400" size={25} />
          <p className="mt-3 text-sm font-medium text-slate-800">No tienes notificaciones</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notificaciones.map((item) => (
            <li
              key={item.id_notificacion}
              className={`rounded-xl border p-4 shadow-sm ${
                item.leida ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50/60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-950">{item.titulo}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{item.mensaje}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={13} />
                    {new Date(item.fecha_creacion).toLocaleString("es-BO")}
                  </p>
                </div>
                {!item.leida ? (
                  <button
                    type="button"
                    onClick={() => marcarLeida(item)}
                    disabled={procesando === item.id_notificacion}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    {procesando === item.id_notificacion ? <Spinner /> : <Check size={14} />}
                    Marcar leída
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;

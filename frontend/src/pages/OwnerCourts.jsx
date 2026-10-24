import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, MapPinned, Plus, SquarePen, Trash2, CalendarClock } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

const CourtLocationModal = lazy(() => import("../components/CourtLocationModal"));

const OwnerCourts = () => {
  const [canchas, setCanchas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState(null);
  const [error, setError] = useState("");
  const [canchaEnMapa, setCanchaEnMapa] = useState(null);

  useEffect(() => {
    const cargarCanchas = async () => {
      try {
        const { data } = await api.get("/courts/mine");
        setCanchas(data.data.canchas);
      } catch (e) {
        setError(getApiError(e));
      } finally {
        setCargando(false);
      }
    };
    cargarCanchas();
  }, []);

  const eliminarCancha = async (cancha) => {
    if (!window.confirm(`¿Eliminar la cancha "${cancha.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setError("");
    setEliminando(cancha.id_cancha);
    try {
      await api.delete(`/courts/${cancha.id_cancha}`);
      setCanchas((actuales) => actuales.filter((item) => item.id_cancha !== cancha.id_cancha));
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">PANEL DEL PROPIETARIO</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Mis canchas</h1>
          <p className="mt-2 text-sm text-slate-600">Consulta y administra tus espacios deportivos.</p>
        </div>
        <Link to="/courts/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">
          <Plus size={17} />
          Nueva cancha
        </Link>
      </header>

      {error ? <div className="mb-5"><Alert>{error}</Alert></div> : null}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Spinner /> Cargando canchas...</div>
      ) : canchas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-5 py-14 text-center">
          <MapPin className="mx-auto text-slate-400" size={25} />
          <p className="mt-3 text-sm font-medium text-slate-800">Aún no tienes canchas registradas</p>
          <p className="mt-1 text-sm text-slate-500">Registra una para comenzar a ofrecerla.</p>
          <Link to="/courts/new" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
            <Plus size={16} /> Agregar cancha
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{canchas.length} {canchas.length === 1 ? "cancha registrada" : "canchas registradas"}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {canchas.map((cancha) => (
              <li key={cancha.id_cancha} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-950">{cancha.nombre}</h2>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={15} className="shrink-0" />{cancha.ubicacion}</p>
                    <p className="mt-3 text-xs font-semibold uppercase text-slate-500">{cancha.deporte}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-800">${Number(cancha.precio_hora).toFixed(2)} / hora</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setCanchaEnMapa(cancha)}
                      aria-label={`Ver ubicación de ${cancha.nombre}`}
                      title="Ver ubicación en el mapa"
                      className="rounded-lg p-2.5 text-emerald-800 transition hover:bg-emerald-50"
                    >
                      <MapPinned size={17} />
                    </button>
                    <Link to={`/courts/${cancha.id_cancha}/schedules`} aria-label={`Configurar horarios de ${cancha.nombre}`} title="Horarios y disponibilidad" className="rounded-lg p-2.5 text-emerald-800 transition hover:bg-emerald-50">
                      <CalendarClock size={17} />
                    </Link>
                    <Link to={`/courts/${cancha.id_cancha}/edit`} aria-label={`Editar ${cancha.nombre}`} title="Editar cancha" className="rounded-lg p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                      <SquarePen size={17} />
                    </Link>
                    <button type="button" onClick={() => eliminarCancha(cancha)} disabled={eliminando === cancha.id_cancha} aria-label={`Eliminar ${cancha.nombre}`} title="Eliminar cancha" className="rounded-lg p-2.5 text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                      {eliminando === cancha.id_cancha ? <Spinner className="h-[17px] w-[17px]" /> : <Trash2 size={17} />}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {canchaEnMapa ? (
        <Suspense fallback={<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60"><Spinner className="h-7 w-7 text-white" /></div>}>
          <CourtLocationModal cancha={canchaEnMapa} onClose={() => setCanchaEnMapa(null)} />
        </Suspense>
      ) : null}
    </div>
  );
};

export default OwnerCourts;
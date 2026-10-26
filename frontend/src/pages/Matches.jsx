import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPinned, Plus, Search, Trophy, Users } from "lucide-react";
import { getMatches } from "../api/matches";
import { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";

const DEPORTES = [
  { value: "", label: "Todos los deportes" },
  { value: "futbol 5", label: "Fútbol 5" },
  { value: "futbol 8", label: "Fútbol 8" },
  { value: "futbol 11", label: "Fútbol 11" },
  { value: "wally", label: "Wally" },
  { value: "padel", label: "Pádel" },
  { value: "fronton", label: "Frontón" },
];

const fechaLocal = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Matches = () => {
  const { user } = useAuth();
  const [partidos, setPartidos] = useState([]);
  const [tipoListado, setTipoListado] = useState("otros");
  const [filters, setFilters] = useState({ deporte: "", fecha: "", ubicacion: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getMatches();
      setPartidos(data?.data?.partidos || []);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const formatearFecha = (fecha) => {
    try {
      return new Date(fecha).toLocaleString("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return fecha;
    }
  };

  const partidosVisibles = partidos.filter((partido) => {
    const esOrganizador = partido.id_organizador === user?.id_usuario;
    if (tipoListado === "mios") return esOrganizador;
    if (esOrganizador) return false;
    if (filters.deporte && partido.deporte?.toLocaleLowerCase("es") !== filters.deporte) return false;
    if (filters.fecha && fechaLocal(partido.fecha_hora) !== filters.fecha) return false;
    const ubicacion = partido.reserva?.cancha?.ubicacion || "";
    if (filters.ubicacion && !ubicacion.toLocaleLowerCase("es").includes(filters.ubicacion.trim().toLocaleLowerCase("es"))) {
      return false;
    }
    return true;
  });

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partidos amistosos</h1>
          <p className="text-sm text-slate-500">Encuentra un partido o crea uno desde una reserva confirmada</p>
        </div>
        {user?.rol === "JUGADOR" ? (
          <Link
            to="/reservations/new"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            <Plus size={16} />
            Crear partido desde reserva
          </Link>
        ) : null}
      </div>

      {error ? <Alert tipo="error">{error}</Alert> : null}

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Tipo de partidos">
        <button
          type="button"
          role="tab"
          aria-selected={tipoListado === "otros"}
          onClick={() => setTipoListado("otros")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tipoListado === "otros"
              ? "bg-emerald-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Partidos de otros
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tipoListado === "mios"}
          onClick={() => setTipoListado("mios")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tipoListado === "mios"
              ? "bg-emerald-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Mis partidos organizados
        </button>
      </div>

      {tipoListado === "otros" ? (
        <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Deporte
            <select
              name="deporte"
              value={filters.deporte}
              onChange={handleFilterChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
            >
              {DEPORTES.map((deporte) => (
                <option key={deporte.value} value={deporte.value}>{deporte.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Fecha
            <input
              name="fecha"
              type="date"
              value={filters.fecha}
              onChange={handleFilterChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Ubicación
            <input
              name="ubicacion"
              type="search"
              value={filters.ubicacion}
              onChange={handleFilterChange}
              placeholder="Zona o dirección"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
            />
          </label>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : partidosVisibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          {tipoListado === "mios" ? (
            <>
              <Trophy className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-3 text-lg font-semibold text-slate-900">No tienes partidos organizados</h2>
              <p className="mt-1 text-sm text-slate-500">
                Cuando organices un partido, aparecerá en esta sección.
              </p>
            </>
          ) : (
            <>
              <Search className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-3 text-lg font-semibold text-slate-900">No hay partidos que coincidan</h2>
              <p className="mt-1 text-sm text-slate-500">
                Prueba cambiando los filtros de deporte, fecha o ubicación.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {partidosVisibles.map((partido) => (
            <Link
              key={partido.id_partido}
              to={`/matches/${partido.id_partido}`}
              className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-600">
                    {partido.nombre}
                  </h3>
                  <p className="text-sm text-slate-500">{partido.deporte}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {partido.estado}
                </span>
              </div>
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-slate-400" />
                  <span>{formatearFecha(partido.fecha_hora)}</span>
                </div>
                {partido.reserva?.cancha ? (
                  <div className="flex items-center gap-2">
                    <MapPinned size={16} className="text-slate-400" />
                    <span>{partido.reserva.cancha.nombre} · {partido.reserva.cancha.ubicacion}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span>Máx. {partido.jugadores_maximos} jugadores</span>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;

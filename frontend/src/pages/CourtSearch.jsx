import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Filter, MapPin, MapPinned, Search, SlidersHorizontal } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

const CourtLocationModal = lazy(() => import("../components/CourtLocationModal"));

const DEPORTES = [
  { value: "", label: "Todos los deportes" },
  { value: "futbol 5", label: "Fútbol 5" },
  { value: "futbol 8", label: "Fútbol 8" },
  { value: "futbol 11", label: "Fútbol 11" },
  { value: "wally", label: "Wally" },
  { value: "padel", label: "Pádel" },
  { value: "fronton", label: "Frontón" },
];

const CourtSearch = () => {
  const [canchas, setCanchas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [sinResultados, setSinResultados] = useState(false);

  const [filters, setFilters] = useState({
    deporte: "",
    ubicacion: "",
    precio_max: "",
    fecha: "",
  });

  const [showFilters, setShowFilters] = useState(true);
  const [canchaEnMapa, setCanchaEnMapa] = useState(null);

  const cargarCanchas = async (filtros = filters) => {
    setCargando(true);
    setError("");
    setSinResultados(false);
    try {
      const params = {};
      if (filtros.deporte) params.deporte = filtros.deporte;
      if (filtros.ubicacion) params.ubicacion = filtros.ubicacion;
      if (filtros.precio_max !== "") params.precio_max = filtros.precio_max;
      if (filtros.fecha) params.fecha = filtros.fecha;

      const { data } = await api.get("/courts", { params });
      const resultado = data?.data?.canchas || [];
      setCanchas(resultado);
      if (resultado.length === 0) {
        setSinResultados(true);
      }
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCanchas();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const aplicarFiltros = (e) => {
    e.preventDefault();
    cargarCanchas(filters);
  };

  const limpiarFiltros = () => {
    const vacios = {
      deporte: "",
      ubicacion: "",
      precio_max: "",
      fecha: "",
    };
    setFilters(vacios);
    cargarCanchas(vacios);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <header className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">BUSCAR CANCHAS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Encuentra la cancha ideal para tu partido
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Filtra por deporte, ubicación, precio y fecha para ver horarios disponibles.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <SlidersHorizontal size={17} />
          {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
        </button>
      </header>

      {showFilters ? (
        <form
          onSubmit={aplicarFiltros}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2 text-slate-800">
            <Filter size={18} />
            <h2 className="text-base font-semibold">Filtros de búsqueda</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="deporte" className="text-sm font-medium text-slate-700">
                Deporte
              </label>
              <select
                id="deporte"
                name="deporte"
                value={filters.deporte}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {DEPORTES.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ubicacion" className="text-sm font-medium text-slate-700">
                Ubicación
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  id="ubicacion"
                  name="ubicacion"
                  type="text"
                  value={filters.ubicacion}
                  onChange={handleChange}
                  placeholder="Zona, barrio o dirección"
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="precio_max" className="text-sm font-medium text-slate-700">
                Precio máximo (Bs/hora)
              </label>
              <input
                id="precio_max"
                name="precio_max"
                type="number"
                min="0"
                step="10"
                value={filters.precio_max}
                onChange={handleChange}
                placeholder="500"
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fecha" className="text-sm font-medium text-slate-700">
                Fecha
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  id="fecha"
                  name="fecha"
                  type="date"
                  value={filters.fecha}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              <Search size={17} />
              Aplicar filtros
            </button>
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Limpiar filtros
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner /> Buscando canchas...
        </div>
      ) : sinResultados ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-5 py-14 text-center">
          <Search className="mx-auto text-slate-400" size={25} />
          <p className="mt-3 text-sm font-medium text-slate-800">
            No existen resultados para esta búsqueda
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Prueba ajustando los filtros o limpiando la búsqueda para ver más opciones.
          </p>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ver todas las canchas
          </button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {canchas.length} {canchas.length === 1 ? "cancha encontrada" : "canchas encontradas"}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {canchas.map((cancha) => (
              <li
                key={cancha.id_cancha}
                className="group rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-slate-950">
                        {cancha.nombre}
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin size={15} className="shrink-0" />
                        <span className="truncate">{cancha.ubicacion}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setCanchaEnMapa(cancha)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        title="Ver ubicación en el mapa"
                      >
                        <MapPinned size={14} />
                        Ver ubicación de la cancha
                      </button>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      {cancha.deporte}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-lg font-semibold text-emerald-800">
                      Bs. {Number(cancha.precio_hora).toFixed(2)}{" "}
                      <span className="text-sm font-normal text-slate-500">/ hora</span>
                    </p>
                  </div>
                  {Array.isArray(cancha.horarios) && cancha.horarios.length > 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Horarios configurados: {cancha.horarios.length} franja(s)
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-amber-600">
                      Sin horarios configurados aún
                    </p>
                  )}
                  <div className="mt-5">
                    <Link
                      to={
                        filters.fecha
                          ? `/courts/${cancha.id_cancha}/availability?fecha=${encodeURIComponent(filters.fecha)}`
                          : `/courts/${cancha.id_cancha}/availability`
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-emerald-800"
                    >
                      <Calendar size={17} />
                      Ver horarios disponibles
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
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

export default CourtSearch;

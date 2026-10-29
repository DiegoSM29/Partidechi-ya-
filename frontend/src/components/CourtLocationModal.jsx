import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Polygon, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { COURT_MAP_MARKER } from "./CourtMapMarker";
import Spinner from "./Spinner";
import {
  COCHABAMBA_BOUNDS,
  COCHABAMBA_CENTER,
  COCHABAMBA_MASK_OUTER,
  COCHABAMBA_OUTLINE_LATLNG,
  isCochabambaDepartmentAddress,
  isWithinCochabambaBounds,
} from "../utils/cochabamba";

const MAP_BOUNDS = L.latLngBounds(COCHABAMBA_BOUNDS);

const CourtLocationModal = ({ cancha, onClose }) => {
  const latitude = Number(cancha.latitud);
  const longitude = Number(cancha.longitud);
  const hasCoordinates =
    cancha.latitud !== null &&
    cancha.latitud !== undefined &&
    cancha.longitud !== null &&
    cancha.longitud !== undefined &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    isWithinCochabambaBounds(latitude, longitude);
  const [position, setPosition] = useState(
    hasCoordinates ? [Number(cancha.latitud), Number(cancha.longitud)] : null
  );
  const [cargando, setCargando] = useState(!hasCoordinates);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (hasCoordinates) return undefined;
    let cancelled = false;
    const buscarCoordenadas = async () => {
      const [southWest, northEast] = COCHABAMBA_BOUNDS;
      const params = new URLSearchParams({
        q: `${cancha.ubicacion}, Cochabamba, Bolivia`,
        countrycodes: "bo",
        format: "jsonv2",
        addressdetails: "1",
        limit: "5",
        viewbox: `${southWest[1]},${northEast[0]},${northEast[1]},${southWest[0]}`,
        bounded: "1",
        "accept-language": "es",
      });
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
        if (!response.ok) throw new Error("No se pudo consultar la dirección.");
        const results = await response.json();
        const result = results.find(({ address }) =>
          isCochabambaDepartmentAddress(address)
        );
        if (!result) throw new Error("No fue posible ubicar esta dirección en el mapa.");
        if (!cancelled) setPosition([Number(result.lat), Number(result.lon)]);
      } catch (lookupError) {
        if (!cancelled) {
          setError(lookupError.message || "No se pudo consultar la dirección.");
        }
      } finally {
        if (!cancelled) setCargando(false);
      }
    };
    buscarCoordenadas();
    return () => {
      cancelled = true;
    };
  }, [cancha.ubicacion, hasCoordinates]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="court-location-title"
        className="relative isolate z-0 flex h-[92vh] max-h-[760px] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="relative z-20 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 pr-14 sm:px-6 sm:pr-16">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-emerald-700">Ubicación de la cancha</p>
            <h2 id="court-location-title" className="mt-1 truncate text-lg font-semibold text-slate-950">
              {cancha.nombre}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
              <MapPin size={15} className="shrink-0" />
              <span className="truncate">{cancha.ubicacion}</span>
            </p>
          </div>
        </header>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar mapa"
          title="Cerrar mapa"
          className="absolute right-3 top-3 z-[1000] rounded-lg bg-white p-2 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-950"
        >
          <X size={20} />
        </button>

        <div className="relative isolate z-0 min-h-0 flex-1 bg-slate-100">
          <MapContainer
            center={position || COCHABAMBA_CENTER}
            zoom={position ? 16 : 8}
            minZoom={7}
            maxZoom={19}
            maxBounds={MAP_BOUNDS}
            maxBoundsViscosity={1}
            className="relative z-0 h-full min-h-0 w-full"
            scrollWheelZoom
          >
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Polygon
              positions={[COCHABAMBA_MASK_OUTER, COCHABAMBA_OUTLINE_LATLNG]}
              pathOptions={{
                color: "#e2e8f0",
                weight: 0,
                fillColor: "#e2e8f0",
                fillOpacity: 1,
                fillRule: "evenodd",
              }}
              interactive={false}
            />
            <Polygon
              positions={COCHABAMBA_OUTLINE_LATLNG}
              pathOptions={{ color: "#047857", weight: 2, fill: false }}
              interactive={false}
            />
            {position ? <Marker position={position} icon={COURT_MAP_MARKER} /> : null}
          </MapContainer>
          {cargando || error ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 px-6 text-center">
              {cargando ? (
                <span className="flex items-center gap-2 text-sm text-slate-700"><Spinner /> Buscando ubicación...</span>
              ) : (
                <span role="alert" className="text-sm text-red-700">{error}</span>
              )}
            </div>
          ) : null}
        </div>
        <footer className="relative z-20 shrink-0 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:px-6">
          Mapa y datos © OpenStreetMap contributors
        </footer>
      </section>
    </div>
  );
};

export default CourtLocationModal;
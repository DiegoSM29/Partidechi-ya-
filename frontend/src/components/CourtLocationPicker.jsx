import { useEffect, useRef, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { COURT_MAP_MARKER } from "./CourtMapMarker";
import {
  COCHABAMBA_BOUNDS,
  COCHABAMBA_CENTER,
  COCHABAMBA_MASK_OUTER,
  COCHABAMBA_OUTLINE_LATLNG,
  isCochabambaDepartmentAddress,
  isWithinCochabambaBounds,
} from "../utils/cochabamba";

const MAP_BOUNDS = L.latLngBounds(COCHABAMBA_BOUNDS);

const MapViewportController = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target.center, target.zoom, { duration: 0.7 });
    } else {
      map.fitBounds(MAP_BOUNDS, { padding: [12, 12], maxZoom: 8 });
    }
  }, [map, target]);
  return null;
};

const MapClickHandler = ({ onSelect }) => {
  useMapEvents({
    click: ({ latlng }) => onSelect(latlng.lat, latlng.lng),
  });
  return null;
};

const CourtLocationPicker = ({
  position,
  addressRevision,
  onPositionChange,
  onAddressChange,
}) => {
  const [geolocalizando, setGeolocalizando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState([]);
  const [mapTarget, setMapTarget] = useState(() =>
    position
      ? { center: [position.latitud, position.longitud], zoom: 16 }
      : null
  );
  const [estadoDireccion, setEstadoDireccion] = useState("");
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const lastRequestRef = useRef(0);
  const selectionRef = useRef(0);
  const searchRef = useRef(0);
  const addressRevisionRef = useRef(addressRevision);

  useEffect(() => {
    if (addressRevisionRef.current === addressRevision) return;
    addressRevisionRef.current = addressRevision;
    selectionRef.current += 1;
    window.clearTimeout(timerRef.current);
    setEstadoDireccion("");
  }, [addressRevision]);

  const seleccionarPunto = async (latitude, longitude) => {
    const selectionId = ++selectionRef.current;
    setError("");
    onAddressChange("");
    onPositionChange(null);
    if (!isWithinCochabambaBounds(latitude, longitude)) {
      setError("El punto debe estar dentro del departamento de Cochabamba, Bolivia.");
      return;
    }

    setEstadoDireccion("Verificando ubicación y buscando calle...");
    window.clearTimeout(timerRef.current);

    const wait = Math.max(0, 1100 - (Date.now() - lastRequestRef.current));
    timerRef.current = window.setTimeout(async () => {
      lastRequestRef.current = Date.now();
      const params = new URLSearchParams({
        format: "jsonv2",
        lat: String(latitude),
        lon: String(longitude),
        zoom: "18",
        addressdetails: "1",
        "accept-language": "es",
      });
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
        if (!response.ok) throw new Error("No se pudo consultar la dirección");
        const result = await response.json();
        if (selectionId !== selectionRef.current) return;
        if (!isCochabambaDepartmentAddress(result.address)) {
          onPositionChange(null);
          setEstadoDireccion("");
          setError("El punto debe estar dentro del departamento de Cochabamba, Bolivia.");
          return;
        }
        const address = result.address || {};
        const street =
          address.road ||
          address.pedestrian ||
          address.residential ||
          address.footway ||
          address.path;
        onPositionChange({ latitud: latitude, longitud: longitude });
        if (street) {
          const streetLine = [street, address.house_number]
            .filter(Boolean)
            .join(" ")
            .slice(0, 200);
          onAddressChange(streetLine);
          setEstadoDireccion("Calle encontrada; puedes editarla.");
        } else {
          onAddressChange("");
          setEstadoDireccion("No se encontró una calle; puedes escribirla manualmente.");
        }
      } catch {
        if (selectionId !== selectionRef.current) return;
        setEstadoDireccion("");
        setError("No se pudo obtener la calle. Comprueba tu conexión y vuelve a marcar el punto.");
      }
    }, wait);
  };

  const buscarDireccion = async () => {
    const query = consulta.trim();
    if (!query) return;
    const searchId = ++searchRef.current;
    setBuscando(true);
    setResultados([]);
    setError("");
    setEstadoDireccion("");

    const wait = Math.max(0, 1100 - (Date.now() - lastRequestRef.current));
    window.setTimeout(async () => {
      lastRequestRef.current = Date.now();
      const [southWest, northEast] = COCHABAMBA_BOUNDS;
      const params = new URLSearchParams({
        q: `${query}, Cochabamba, Bolivia`,
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
        if (!response.ok) throw new Error("No se pudo buscar la dirección");
        const items = await response.json();
        if (searchId !== searchRef.current) return;
        const matches = items.filter(({ address }) =>
          isCochabambaDepartmentAddress(address)
        );
        setResultados(matches);
        if (matches.length === 0) {
          setError("No se encontraron direcciones dentro del departamento de Cochabamba.");
        }
      } catch {
        if (searchId === searchRef.current) {
          setError("No se pudo buscar la dirección. Comprueba tu conexión e intenta otra vez.");
        }
      } finally {
        if (searchId === searchRef.current) setBuscando(false);
      }
    }, wait);
  };

  const seleccionarResultado = (result) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    setResultados([]);
    setMapTarget({ center: [latitude, longitude], zoom: 17 });
    seleccionarPunto(latitude, longitude);
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setError("Este navegador no permite obtener la ubicación actual.");
      return;
    }
    setGeolocalizando(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGeolocalizando(false);
        setMapTarget({ center: [coords.latitude, coords.longitude], zoom: 16 });
        seleccionarPunto(coords.latitude, coords.longitude);
      },
      () => {
        setGeolocalizando(false);
        setError("No se pudo obtener tu ubicación. Revisa los permisos del navegador.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">Busca una dirección o marca el punto en el mapa.</p>
        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={geolocalizando}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {geolocalizando ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" /> : <LocateFixed size={16} />}
          {geolocalizando ? "Localizando..." : "Usar mi ubicación"}
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={consulta}
          onChange={(event) => setConsulta(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              buscarDireccion();
            }
          }}
          placeholder="Ej. Calle Carmela Serruto, Quillacollo"
          aria-label="Buscar dirección en Cochabamba"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <button
          type="button"
          onClick={buscarDireccion}
          disabled={buscando || !consulta.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          <Search size={16} />
          {buscando ? "Buscando..." : "Buscar"}
        </button>
      </div>
      {resultados.length > 0 ? (
        <ul className="max-h-44 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {resultados.map((result) => (
            <li key={`${result.place_id}-${result.lat}-${result.lon}`}>
              <button
                type="button"
                onClick={() => seleccionarResultado(result)}
                className="w-full px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-emerald-50"
              >
                {result.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative isolate z-0 h-[360px] overflow-hidden rounded-lg border border-slate-300 sm:h-[420px]">
        <MapContainer
          center={COCHABAMBA_CENTER}
          zoom={8}
          minZoom={7}
          maxZoom={18}
          maxBounds={MAP_BOUNDS}
          maxBoundsViscosity={1}
          className="relative z-0 h-full w-full"
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
          <MapViewportController target={mapTarget} />
          <MapClickHandler onSelect={seleccionarPunto} />
          {position ? (
            <Marker
              position={[position.latitud, position.longitud]}
              icon={COURT_MAP_MARKER}
            />
          ) : null}
        </MapContainer>
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{estadoDireccion || "Cobertura: departamento de Cochabamba, Bolivia"}</span>
        {position ? (
          <span>{position.latitud.toFixed(5)}, {position.longitud.toFixed(5)}</span>
        ) : null}
      </div>
      {error ? <p role="alert" className="text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
};

export default CourtLocationPicker;
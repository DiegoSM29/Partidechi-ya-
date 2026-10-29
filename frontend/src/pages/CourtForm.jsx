import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { Campo, inputCls } from "../components/FormFields";
import { isWithinCochabambaBounds } from "../utils/cochabamba";

const CourtLocationPicker = lazy(() => import("../components/CourtLocationPicker"));

const DEPORTES = [
  { value: "futbol 5", label: "Fútbol 5" },
  { value: "futbol 8", label: "Fútbol 8" },
  { value: "futbol 11", label: "Fútbol 11" },
  { value: "wally", label: "Wally" },
  { value: "padel", label: "Pádel" },
  { value: "fronton", label: "Frontón" },
];

const FORM_VACIO = {
  nombre: "",
  ubicacion: "",
  latitud: null,
  longitud: null,
  deporte: "",
  precio_hora: "",
};

const CourtForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(id);
  const [form, setForm] = useState(FORM_VACIO);
  const [cargando, setCargando] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState({});
  const [addressRevision, setAddressRevision] = useState(0);

  useEffect(() => {
    if (!id) return;
    const cargarCancha = async () => {
      try {
        const { data } = await api.get("/courts/mine");
        const cancha = data.data.canchas.find((item) => String(item.id_cancha) === id);
        if (!cancha) {
          setError("Cancha no encontrada o no tienes permiso para editarla.");
          return;
        }
        const latitud = cancha.latitud == null ? null : Number(cancha.latitud);
        const longitud = cancha.longitud == null ? null : Number(cancha.longitud);
        const coordenadasValidas =
          Number.isFinite(latitud) &&
          Number.isFinite(longitud) &&
          isWithinCochabambaBounds(latitud, longitud);
        setForm({
          nombre: cancha.nombre,
          ubicacion: cancha.ubicacion,
          latitud: coordenadasValidas ? latitud : null,
          longitud: coordenadasValidas ? longitud : null,
          deporte: cancha.deporte,
          precio_hora: String(cancha.precio_hora),
        });
      } catch (e) {
        setError(getApiError(e));
      } finally {
        setCargando(false);
      }
    };
    cargarCancha();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({ ...actual, [name]: value }));
    setErrores((actuales) => ({ ...actuales, [name]: "" }));
    if (name === "ubicacion") setAddressRevision((revision) => revision + 1);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const nuevosErrores = {};
    if (!form.nombre.trim()) nuevosErrores.nombre = "Escribe el nombre de la cancha.";
    if (
      !form.ubicacion ||
      form.latitud === null ||
      form.longitud === null ||
      !Number.isFinite(Number(form.latitud)) ||
      !Number.isFinite(Number(form.longitud))
    ) {
      nuevosErrores.ubicacion = "Marca la ubicación en el mapa para completar la dirección.";
    }
    if (!form.deporte) nuevosErrores.deporte = "Selecciona el deporte de la cancha.";
    if (form.precio_hora.trim() === "") {
      nuevosErrores.precio_hora = "Indica cuánto cuesta alquilarla por hora.";
    } else if (!Number.isFinite(Number(form.precio_hora)) || Number(form.precio_hora) < 0) {
      nuevosErrores.precio_hora = "Ingresa un precio válido, igual o mayor que cero.";
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setGuardando(true);
    const payload = {
      nombre: form.nombre.trim(),
      ubicacion: form.ubicacion.trim(),
      latitud: form.latitud,
      longitud: form.longitud,
      deporte: form.deporte,
      precio_hora: Number(form.precio_hora),
    };

    try {
      if (editando) {
        await api.patch(`/courts/${id}`, payload);
      } else {
        await api.post("/courts", payload);
      }
      navigate("/courts");
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setGuardando(false);
    }
  };

  const tieneCoordenadasValidas =
    form.latitud !== null &&
    form.latitud !== undefined &&
    form.longitud !== null &&
    form.longitud !== undefined &&
    Number.isFinite(Number(form.latitud)) &&
    Number.isFinite(Number(form.longitud)) &&
    isWithinCochabambaBounds(Number(form.latitud), Number(form.longitud));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      <Link to="/courts" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
        <ArrowLeft size={16} /> Volver a mis canchas
      </Link>
      <div className="mb-6 border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-emerald-700">PANEL DEL PROPIETARIO</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{editando ? "Editar cancha" : "Nueva cancha"}</h1>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500"><Spinner /> Cargando cancha...</div>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <Alert>{error}</Alert>
          <p className="text-sm text-slate-600">Completa los campos marcados con * para registrar la cancha.</p>
          <Campo id="court-name" etiqueta="Nombre *" error={errores.nombre}>
            <input required maxLength={100} id="court-name" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Cancha Central" aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? "court-name-error" : undefined} className={inputCls(Boolean(errores.nombre))} />
          </Campo>
          <Campo id="court-location" etiqueta="Ubicación *" error={errores.ubicacion}>
            <div className="space-y-3">
              <Suspense fallback={<div className="flex h-[360px] items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm text-slate-500 sm:h-[420px]"><Spinner /> Cargando mapa...</div>}>
                <CourtLocationPicker
                  position={tieneCoordenadasValidas ? {
                    latitud: Number(form.latitud),
                    longitud: Number(form.longitud),
                  } : null}
                  addressRevision={addressRevision}
                  onPositionChange={(position) =>
                    setForm((actual) => ({
                      ...actual,
                      latitud: position?.latitud ?? null,
                      longitud: position?.longitud ?? null,
                    }))
                  }
                  onAddressChange={(ubicacion) => {
                    setForm((actual) => ({ ...actual, ubicacion }));
                    setErrores((actuales) => ({ ...actuales, ubicacion: "" }));
                  }}
                />
              </Suspense>
              <input
                required
                id="court-location"
                name="ubicacion"
                maxLength={200}
                value={form.ubicacion}
                onChange={handleChange}
                placeholder="Escribe o ajusta la calle encontrada"
                aria-invalid={Boolean(errores.ubicacion)}
                aria-describedby={errores.ubicacion ? "court-location-error" : undefined}
                className={inputCls(Boolean(errores.ubicacion))}
              />
            </div>
          </Campo>
          <Campo id="court-sport" etiqueta="Deporte *" error={errores.deporte}>
            <select required id="court-sport" name="deporte" value={form.deporte} onChange={handleChange} aria-invalid={Boolean(errores.deporte)} aria-describedby={errores.deporte ? "court-sport-error" : undefined} className={inputCls(Boolean(errores.deporte))}>
              <option value="" disabled>Selecciona un deporte</option>
              {DEPORTES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Campo>
          <Campo id="court-price" etiqueta="Precio por hora *" error={errores.precio_hora}>
            <div className={`flex overflow-hidden rounded-xl border focus-within:ring-2 focus-within:ring-emerald-500 ${errores.precio_hora ? "border-red-400" : "border-slate-300"}`}>
              <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">Bs</span>
              <input required id="court-price" type="number" min="0" step="0.01" name="precio_hora" value={form.precio_hora} onChange={handleChange} placeholder="0.00" aria-invalid={Boolean(errores.precio_hora)} aria-describedby={errores.precio_hora ? "court-price-error" : undefined} className="w-full min-w-0 px-3.5 py-2.5 text-sm text-slate-900 outline-none" />
            </div>
          </Campo>
          <button type="submit" disabled={guardando || (editando && !form.nombre)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
            {guardando ? <Spinner className="h-4 w-4 text-white" /> : <Save size={16} />}
            {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear cancha"}
          </button>
        </form>
      )}
    </div>
  );
};

export default CourtForm;
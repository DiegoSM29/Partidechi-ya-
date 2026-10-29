import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Eye, EyeOff, Trophy, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { validarRegistro } from "../utils/validators";
import { getHomeForRole } from "../utils/roles";
import { getApiError } from "../api/client";
import AuthLayout from "../components/AuthLayout";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { Campo, inputCls } from "../components/FormFields";

const OPCIONES_ROL = [
  {
    valor: "jugador",
    titulo: "Jugador",
    descripcion: "Busco canchas y armo partidos",
    Icono: Trophy,
  },
  {
    valor: "propietario",
    titulo: "Propietario",
    descripcion: "Administro mis canchas",
    Icono: Building2,
  },
];

// Vista de registro (publica)
const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    password: "",
    passwordConfirmacion: "",
    rol: "jugador",
  });
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  };

  const seleccionarRol = (valor) => {
    setForm((prev) => ({ ...prev, rol: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validarRegistro(form);
    setErrores(errs);
    setErrorServidor("");
    if (Object.keys(errs).length > 0) return;

    setEnviando(true);
    try {
      const user = await register({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        correo: form.correo.trim().toLowerCase(),
        password: form.password,
        telefono: form.telefono.trim() || undefined,
        rol: form.rol,
      });
      // Registro exitoso: el backend ya devolvio token -> sesion activa
      navigate(getHomeForRole(user.rol), { replace: true });
    } catch (error) {
      // 400 correo duplicado o datos invalidos | 403 rol no permitido
      setErrorServidor(getApiError(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout
      titulo="Crea tu cuenta"
      subtitulo="Unite a Partidechi ya! en segundos"
      pieTexto="¿Ya tienes cuenta?"
      pieEnlace="Inicia sesion"
      pieRuta="/login"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Alert tipo="error">{errorServidor}</Alert>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre" error={errores.nombre}>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Tu nombre"
              autoComplete="given-name"
              className={inputCls(errores.nombre)}
            />
          </Campo>
          <Campo etiqueta="Apellido" error={errores.apellido}>
            <input
              type="text"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              placeholder="Tu apellido"
              autoComplete="family-name"
              className={inputCls(errores.apellido)}
            />
          </Campo>
        </div>

        <Campo etiqueta="Correo electronico" error={errores.correo}>
          <input
            type="email"
            name="correo"
            value={form.correo}
            onChange={handleChange}
            placeholder="tu@correo.com"
            autoComplete="email"
            className={inputCls(errores.correo)}
          />
        </Campo>

        <Campo etiqueta="Telefono (opcional)">
          <input
            type="tel"
            name="telefono"
            value={form.telefono}
            onChange={handleChange}
            placeholder="Ej. 11 2345 6789"
            autoComplete="tel"
            className={inputCls(false)}
          />
        </Campo>

        <Campo etiqueta="contraseña" error={errores.password}>
          <div className="relative">
            <input
              type={mostrarPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimo 8 caracteres"
              autoComplete="new-password"
              className={`${inputCls(errores.password)} pr-11`}
            />
            <button
              type="button"
              onClick={() => setMostrarPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Campo>

        <Campo etiqueta="Confirmar contraseña" error={errores.passwordConfirmacion}>
          <input
            type="password"
            name="passwordConfirmacion"
            value={form.passwordConfirmacion}
            onChange={handleChange}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            className={inputCls(errores.passwordConfirmacion)}
          />
        </Campo>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Tipo de cuenta (opcional)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {OPCIONES_ROL.map(({ valor, titulo, descripcion, Icono }) => {
              const activo = form.rol === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => seleccionarRol(valor)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                    activo
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/40"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  aria-pressed={activo}
                >
                  <Icono size={18} className={activo ? "text-emerald-600" : "text-slate-400"} />
                  <span className="text-sm font-semibold text-slate-900">{titulo}</span>
                  <span className="text-xs text-slate-500">{descripcion}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? (
            <Spinner className="h-4 w-4 text-white" />
          ) : (
            <UserPlus size={16} />
          )}
          {enviando ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Register;

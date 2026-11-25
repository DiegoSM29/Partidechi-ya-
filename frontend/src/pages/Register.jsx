import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Check, Eye, EyeOff, Trophy, UserPlus } from "lucide-react";
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
      <form onSubmit={handleSubmit} noValidate>
        <Alert tipo="error">{errorServidor}</Alert>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="register-first-name" etiqueta="Nombre" error={errores.nombre}>
            <input
              id="register-first-name"
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Tu nombre"
              autoComplete="given-name"
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={errores.nombre ? "register-first-name-error" : undefined}
              className={inputCls(errores.nombre)}
            />
          </Campo>
          <Campo id="register-last-name" etiqueta="Apellido" error={errores.apellido}>
            <input
              id="register-last-name"
              type="text"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              placeholder="Tu apellido"
              autoComplete="family-name"
              aria-invalid={Boolean(errores.apellido)}
              aria-describedby={errores.apellido ? "register-last-name-error" : undefined}
              className={inputCls(errores.apellido)}
            />
          </Campo>
        </div>

        <Campo id="register-email" etiqueta="Correo electrónico" error={errores.correo}>
          <input
            id="register-email"
            type="email"
            name="correo"
            value={form.correo}
            onChange={handleChange}
            placeholder="tu@correo.com"
            autoComplete="email"
            aria-invalid={Boolean(errores.correo)}
            aria-describedby={errores.correo ? "register-email-error" : undefined}
            className={inputCls(errores.correo)}
          />
        </Campo>

        <Campo id="register-phone" etiqueta="Teléfono (opcional)">
          <input
            id="register-phone"
            type="tel"
            name="telefono"
            value={form.telefono}
            onChange={handleChange}
            placeholder="Ej. 11 2345 6789"
            autoComplete="tel"
            className={inputCls(false)}
          />
        </Campo>

        <Campo id="register-password" etiqueta="Contraseña" error={errores.password}>
          <div className="relative">
            <input
              id="register-password"
              type={mostrarPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimo 8 caracteres"
              autoComplete="new-password"
              aria-invalid={Boolean(errores.password)}
              aria-describedby={errores.password ? "register-password-error" : undefined}
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

        <Campo id="register-password-confirmation" etiqueta="Confirmar contraseña" error={errores.passwordConfirmacion}>
          <input
            id="register-password-confirmation"
            type="password"
            name="passwordConfirmacion"
            value={form.passwordConfirmacion}
            onChange={handleChange}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            aria-invalid={Boolean(errores.passwordConfirmacion)}
            aria-describedby={errores.passwordConfirmacion ? "register-password-confirmation-error" : undefined}
            className={inputCls(errores.passwordConfirmacion)}
          />
        </Campo>

        <fieldset className="auth-role-group">
          <legend className="mb-2 block text-sm font-semibold text-slate-700">
            ¿Cómo usarás Partidechi?
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {OPCIONES_ROL.map(({ valor, titulo, descripcion, Icono }) => {
              const activo = form.rol === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => seleccionarRol(valor)}
                  className={`auth-role-option ${activo ? "is-selected" : ""}`}
                  aria-pressed={activo}
                >
                  <span className={`auth-role-icon ${activo ? "is-selected" : ""}`}>
                    <Icono size={18} />
                  </span>
                  <span className="auth-role-title">{titulo}</span>
                  <span className="auth-role-description">{descripcion}</span>
                  {activo ? <span className="auth-role-check"><Check size={12} /></span> : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={enviando}
          className="auth-submit flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
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

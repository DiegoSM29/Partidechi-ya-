import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { validarLogin } from "../utils/validators";
import { getHomeForRole } from "../utils/roles";
import { getApiError } from "../api/client";
import AuthLayout from "../components/AuthLayout";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { Campo, inputCls } from "../components/FormFields";

// Vista de inicio de sesion (publica)
const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ correo: "", password: "" });
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validarLogin(form);
    setErrores(errs);
    setErrorServidor("");
    if (Object.keys(errs).length > 0) return;

    setEnviando(true);
    try {
      const user = await login(form.correo.trim(), form.password);
      // Si venia de una ruta protegida, vuelve a ella; si no, entra segun su rol
      const destino = location.state?.from || getHomeForRole(user.rol);
      navigate(destino, { replace: true });
    } catch (error) {
      // 401 credenciales incorrectas | 403 cuenta inactiva | error de red
      setErrorServidor(getApiError(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout
      titulo="Bienvenido"
      subtitulo="Ingresa a tu cuenta para seguir jugando"
      pieTexto="¿No tienes cuenta?"
      pieEnlace="Registrate aqui"
      pieRuta="/register"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Alert tipo="error">{errorServidor}</Alert>

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

        <Campo etiqueta="contraseña" error={errores.password}>
          <div className="relative">
            <input
              type={mostrarPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Tu contraseña"
              autoComplete="current-password"
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

        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? (
            <Spinner className="h-4 w-4 text-white" />
          ) : (
            <LogIn size={16} />
          )}
          {enviando ? "Ingresando..." : "Iniciar sesion"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;

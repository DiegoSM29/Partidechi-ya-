import Spinner from "./Spinner";

// Pantalla de carga a pantalla completa (validacion de sesion inicial)
const LoadingScreen = ({ mensaje = "Verificando sesion..." }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
    <Spinner className="h-8 w-8 text-emerald-600" />
    <p className="text-sm">{mensaje}</p>
  </div>
);

export default LoadingScreen;

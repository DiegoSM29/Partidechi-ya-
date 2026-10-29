import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

const NotFound = () => (
  <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
    <p className="text-7xl font-black text-emerald-600">404</p>
    <h1 className="mt-3 text-xl font-bold text-slate-900">Pagina no encontrada</h1>
    <p className="mt-1 max-w-sm text-sm text-slate-500">
      La ruta que buscas no existe o fue movida.
    </p>
    <Link
      to="/"
      className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
    >
      <Compass size={16} />
      Volver al inicio
    </Link>
  </div>
);

export default NotFound;

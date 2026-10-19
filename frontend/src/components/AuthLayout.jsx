import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";

// Estructura comun de las vistas publicas: tarjeta centrada sobre
// fondo con degradado deportivo. Login y Registro la reutilizan.
const AuthLayout = ({ titulo, subtitulo, children, pieTexto, pieEnlace, pieRuta }) => (
  <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 px-4 py-10">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <Trophy size={22} />
        </span>
        <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
      </div>

      {children}

      <p className="mt-6 text-center text-sm text-slate-500">
        {pieTexto}{" "}
        <Link to={pieRuta} className="font-semibold text-emerald-600 hover:text-emerald-500">
          {pieEnlace}
        </Link>
      </p>
    </div>
  </div>
);

export default AuthLayout;

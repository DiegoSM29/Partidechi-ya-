import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPinned, Users, Trophy, Plus } from "lucide-react";
import { getMatches } from "../api/matches";
import { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";

const Matches = () => {
  const { user } = useAuth();
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getMatches();
      setPartidos(data?.data?.partidos || []);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const formatearFecha = (fecha) => {
    try {
      return new Date(fecha).toLocaleString("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return fecha;
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partidos amistosos</h1>
          <p className="text-sm text-slate-500">Únete a un partido o crea uno desde una reserva confirmada</p>
        </div>
        {user?.rol === "JUGADOR" ? (
          <Link
            to="/reservations/new"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            <Plus size={16} />
            Crear partido desde reserva
          </Link>
        ) : null}
      </div>

      {error ? <Alert tipo="error">{error}</Alert> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : partidos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <Trophy className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">No hay partidos publicados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Crea un partido asociado a una reserva confirmada para coordinar un encuentro con tus amigos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {partidos.map((partido) => (
            <Link
              key={partido.id_partido}
              to={`/matches/${partido.id_partido}`}
              className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-600">
                    {partido.nombre}
                  </h3>
                  <p className="text-sm text-slate-500">{partido.deporte}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {partido.estado}
                </span>
              </div>
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-slate-400" />
                  <span>{formatearFecha(partido.fecha_hora)}</span>
                </div>
                {partido.reserva?.cancha ? (
                  <div className="flex items-center gap-2">
                    <MapPinned size={16} className="text-slate-400" />
                    <span>{partido.reserva.cancha.nombre} · {partido.reserva.cancha.ubicacion}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span>Máx. {partido.jugadores_maximos} jugadores</span>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;

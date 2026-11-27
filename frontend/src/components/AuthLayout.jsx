import { Link } from "react-router-dom";
import { CalendarCheck, MapPinned, Sparkles, Trophy, UsersRound } from "lucide-react";

// Estructura comun de las vistas publicas: tarjeta centrada sobre
// fondo con degradado deportivo. Login y Registro la reutilizan.
const AuthLayout = ({ titulo, subtitulo, children, pieTexto, pieEnlace, pieRuta }) => (
  <div className="auth-layout flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
    <div className="auth-scene">
      <aside className="auth-promo hidden lg:flex" aria-label="Sobre Partidechi ya">
        <div className="auth-pitch-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="auth-promo-content">
          <div className="auth-promo-badge">
            <Sparkles size={15} />
            <span>EL JUEGO EMPIEZA AQUÍ</span>
          </div>
          <div className="auth-promo-icon">
            <Trophy size={30} />
          </div>
          <h2>Menos vueltas.<br />Más partido.</h2>
          <p>Encuentra cancha, arma tu equipo y disfruta el juego. Todo en un mismo lugar.</p>
          <ul className="auth-benefits">
            <li><MapPinned size={17} /><span>Canchas listas para jugar</span></li>
            <li><UsersRound size={17} /><span>Gente con ganas de sumarse</span></li>
            <li><CalendarCheck size={17} /><span>Tu próximo partido, organizado</span></li>
          </ul>
        </div>
        <div className="auth-promo-footer">
          <span className="auth-live-dot" />
          <span>La cancha te está esperando</span>
        </div>
      </aside>

      <section className="auth-card">
        <div className="auth-heading">
          <span className="auth-heading-icon"><Trophy size={20} /></span>
          <div>
            <p className="auth-eyebrow">PARTIDECHI YA!</p>
            <h1>{titulo}</h1>
            <p className="auth-subtitle">{subtitulo}</p>
          </div>
        </div>

        {children}

        <p className="auth-footer">
          {pieTexto}{" "}
          <Link to={pieRuta} className="font-bold text-emerald-700 hover:text-emerald-600">
            {pieEnlace}
          </Link>
        </p>
      </section>
    </div>
  </div>
);

export default AuthLayout;

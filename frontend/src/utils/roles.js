// Mapeo de roles a su vista principal.
// HU-01: todos los roles ingresan al perfil basico; cuando existan
// vistas exclusivas (propietario/administrador) se actualiza aqui.
export const getHomeForRole = () => "/profile";

// Etiquetas y estilos para mostrar roles/estados en la UI
export const ROL_LABEL = {
  JUGADOR: "Jugador",
  PROPIETARIO: "Propietario",
  ADMINISTRADOR: "Administrador",
};

export const ROL_BADGE = {
  JUGADOR: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  PROPIETARIO: "bg-amber-100 text-amber-700 ring-amber-600/20",
  ADMINISTRADOR: "bg-indigo-100 text-indigo-700 ring-indigo-600/20",
};

export const ESTADO_LABEL = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  SUSPENDIDO: "Suspendido",
};

export const ESTADO_BADGE = {
  ACTIVO: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  INACTIVO: "bg-slate-100 text-slate-600 ring-slate-500/20",
  SUSPENDIDO: "bg-red-100 text-red-700 ring-red-600/20",
};

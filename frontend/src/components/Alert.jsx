import { AlertCircle, CheckCircle2 } from "lucide-react";

// Banner de mensaje (error del backend / exito). No renderiza nada si no hay texto.
const Alert = ({ tipo = "error", children }) => {
  if (!children) return null;

  const estilos =
    tipo === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const Icono = tipo === "error" ? AlertCircle : CheckCircle2;

  return (
    <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${estilos}`} role="alert">
      <Icono className="mt-0.5 shrink-0" size={16} />
      <span>{children}</span>
    </div>
  );
};

export default Alert;

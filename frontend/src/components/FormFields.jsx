import { CircleAlert } from "lucide-react";

// Campo de formulario con etiqueta y mensaje de validacion
export const Campo = ({ etiqueta, error, id, children }) => (
  <div className="field-group">
    <label htmlFor={id} className="field-label mb-1.5 block text-sm font-semibold text-slate-700">{etiqueta}</label>
    {children}
    {error ? (
      <p id={id ? `${id}-error` : undefined} className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
        <CircleAlert size={14} aria-hidden="true" />
        {error}
      </p>
    ) : null}
  </div>
);

// Clases comunes de los inputs (borde rojo cuando hay error + focus emerald)
export const inputCls = (error) =>
  [
    "form-control w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900",
    "placeholder-slate-400 outline-none transition focus:ring-2",
    error ? "border-rose-400 focus:ring-rose-400" : "border-emerald-900/15 focus:ring-emerald-500",
  ].join(" ");

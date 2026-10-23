// Campo de formulario con etiqueta y mensaje de validacion
export const Campo = ({ etiqueta, error, id, children }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{etiqueta}</label>
    {children}
    {error ? <p id={id ? `${id}-error` : undefined} className="mt-1 text-xs font-medium text-red-600">{error}</p> : null}
  </div>
);

// Clases comunes de los inputs (borde rojo cuando hay error + focus emerald)
export const inputCls = (error) =>
  [
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900",
    "placeholder-slate-400 outline-none transition focus:ring-2",
    error ? "border-red-400 focus:ring-red-400" : "border-slate-300 focus:ring-emerald-500",
  ].join(" ");

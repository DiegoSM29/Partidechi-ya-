import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { CreditCard, FileCheck } from "lucide-react";
import api, { getApiError } from "../api/client";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

const ReservationPay = () => {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state || {};

  const [reserva, setReserva] = useState(state.reserva || null);
  const [amount, setAmount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: amountRes }, { data: resRes }] = await Promise.allSettled([
        api.get(`/reservations/${id}/payments/amount`),
        api.get(`/reservations/${id}`),
      ]);
      if (amountRes.status === "fulfilled") {
        setAmount(amountRes.value?.data?.amount);
        if (amountRes.value?.data?.reserva) {
          setReserva(amountRes.value?.data?.reserva);
        }
      }
      if (resRes.status === "fulfilled") {
        setReserva(resRes.value?.data?.reserva);
      }
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handlePayPalSimulate = async () => {
    setPaying(true);
    setError("");
    try {
      const { data } = await api.post(`/reservations/${id}/payments/paypal/simulate`, {
        monto: amount || reserva?.monto_total,
      });
      const approvalUrl = data?.data?.approvalUrl;
      if (approvalUrl) {
        window.location.href = approvalUrl;
        return;
      }
      setError(getApiError({ response: { data: { error: "No se pudo redirigir a PayPal" } } }));
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Spinner /> Cargando...
      </div>
    );
  }

  const yaConfirmada = reserva?.estado === "CONFIRMADA";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      {error ? (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {searchParams.get("paypal") === "success" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <FileCheck className="text-emerald-700" size={22} />
            <h2 className="text-lg font-semibold text-emerald-900">Pago completado</h2>
          </div>
          <p className="mt-2 text-sm text-emerald-800">
            El pago con PayPal Sandbox se completó correctamente.
          </p>
          <Link
            to="/courts/search"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Volver
          </Link>
        </div>
      ) : yaConfirmada ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <FileCheck className="text-emerald-700" size={22} />
            <h2 className="text-lg font-semibold text-emerald-900">Reserva confirmada</h2>
          </div>
          <p className="mt-2 text-sm text-emerald-800">La reserva ha sido confirmada.</p>
          <Link
            to="/courts/search"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Volver
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="text-slate-700" size={18} />
            <h2 className="text-lg font-semibold text-slate-900">Pagar con PayPal (Sandbox)</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Se abrirá PayPal Sandbox para simular el pago. Un solo pago por todas las horas seleccionadas.
          </p>
          <button
            type="button"
            onClick={handlePayPalSimulate}
            disabled={paying}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0070BA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005ea6] disabled:opacity-60"
          >
            {paying ? "Procesando..." : "Pagar con PayPal"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReservationPay;

import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { CreditCard, FileCheck, FileText, RefreshCw, ReceiptText, Trophy } from "lucide-react";
import api, { getApiError } from "../api/client";
import { paypalCapture, registerPayment } from "../api/reservations";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";

const ReservationPay = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = location.state || {};
  const paypalStatus = searchParams.get("paypal");
  const paypalToken = searchParams.get("token");
  const capturaRef = useRef(false);

  const [reserva, setReserva] = useState(state.reserva || null);
  const [amount, setAmount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pagoManual, setPagoManual] = useState({
    metodo_pago: "TRANSFERENCIA",
    referencia: "",
    comprobante_url: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [amountResult, reservationResult] = await Promise.allSettled([
        api.get(`/reservations/${id}/payments/amount`),
        api.get(`/reservations/${id}`),
      ]);
      if (amountResult.status === "fulfilled") {
        setAmount(amountResult.value?.data?.data?.amount);
        if (amountResult.value?.data?.data?.reserva) {
          setReserva(amountResult.value.data.data.reserva);
        }
      }
      if (reservationResult.status === "fulfilled") {
        setReserva(reservationResult.value?.data?.data?.reserva);
      } else if (!reserva) {
        throw reservationResult.reason;
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

  const confirmarPagoPayPal = async () => {
    setCapturando(true);
    setError("");
    setMensaje("");
    try {
      const { data } = await paypalCapture(id, {
        orderId: paypalToken || undefined,
      });
      if (data?.data?.reserva) {
        setReserva(data.data.reserva);
      }
      setPagoConfirmado(true);
      setMensaje(data?.message || "Pago confirmado y reserva confirmada automáticamente.");
      setSearchParams({}, { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setCapturando(false);
    }
  };

  useEffect(() => {
    if (paypalStatus !== "success" || capturaRef.current) return;
    capturaRef.current = true;
    confirmarPagoPayPal();
  }, [id, paypalStatus]);

  const handlePayPalSimulate = async () => {
    setPaying(true);
    setError("");
    setMensaje("");
    try {
      const { data } = await api.post(`/reservations/${id}/payments/paypal/simulate`, {
        monto: amount || reserva?.monto_total,
      });
      const approvalUrl = data?.data?.approvalUrl;
      if (approvalUrl) {
        window.location.href = approvalUrl;
        return;
      }
      setError(
        getApiError({
          response: {
            data: {
              error:
                "No se pudo redirigir a PayPal. Puedes registrar el pago manualmente con su referencia o comprobante.",
            },
          },
        })
      );
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setPaying(false);
    }
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    setRegistrando(true);
    setError("");
    setMensaje("");
    try {
      await registerPayment(id, {
        monto: amount || reserva?.monto_total,
        metodo_pago: pagoManual.metodo_pago,
        referencia: pagoManual.referencia || undefined,
        comprobante_url: pagoManual.comprobante_url || undefined,
      });
      setMensaje(
        "Pago registrado correctamente. El propietario debe verificarlo para confirmar la reserva."
      );
      setPagoManual({ metodo_pago: "TRANSFERENCIA", referencia: "", comprobante_url: "" });
      await load();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setRegistrando(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Spinner /> Cargando...
      </div>
    );
  }

  const yaConfirmada = pagoConfirmado || reserva?.estado === "CONFIRMADA";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      {error ? (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {mensaje ? (
        <div className="mb-5">
          <Alert tipo="exito">{mensaje}</Alert>
        </div>
      ) : null}

      {capturando ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          <Spinner /> Confirmando el pago con PayPal...
        </div>
      ) : yaConfirmada ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <FileCheck className="text-emerald-700" size={22} />
            <h2 className="text-lg font-semibold text-emerald-900">Reserva confirmada</h2>
          </div>
          <p className="mt-2 text-sm text-emerald-800">
            El pago fue registrado y la reserva quedó confirmada automáticamente. Ya puedes
            organizar un partido con esta reserva.
          </p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            {user?.rol === "JUGADOR" ? (
              <Link
                to="/matches/create"
                state={{ id_reserva: reserva?.id_reserva ?? Number(id) }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                <Trophy size={16} />
                Organizar partido
              </Link>
            ) : null}
            <Link
              to="/courts/search"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              Volver a buscar canchas
            </Link>
          </div>
        </div>
      ) : paypalStatus === "cancel" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-amber-900">Pago cancelado</h2>
          <p className="mt-2 text-sm text-amber-800">
            No se completó el pago en PayPal. Puedes intentarlo nuevamente o registrar el pago
            manualmente para que el propietario lo verifique.
          </p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handlePayPalSimulate}
              disabled={paying}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0070BA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005ea6] disabled:opacity-60"
            >
              <RefreshCw size={16} />
              Reintentar con PayPal
            </button>
            <Link
              to={`/reservations/${id}/pay`}
              replace
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Registrar pago manual
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="text-slate-700" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">Pagar con PayPal (Sandbox)</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Se abrirá PayPal Sandbox para simular el pago. Un solo pago por todas las horas
              seleccionadas. Al completarlo, la reserva se confirma automáticamente.
            </p>
            {amount || reserva?.monto_total ? (
              <p className="mt-3 text-sm text-slate-700">
                Importe a pagar:{" "}
                <span className="font-semibold text-emerald-800">
                  Bs. {Number(amount || reserva?.monto_total || 0).toFixed(2)}
                </span>
              </p>
            ) : null}
            <button
              type="button"
              onClick={handlePayPalSimulate}
              disabled={paying}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0070BA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005ea6] disabled:opacity-60"
            >
              {paying ? "Procesando..." : "Pagar con PayPal"}
            </button>
            {paypalStatus === "success" && !capturando ? (
              <button
                type="button"
                onClick={confirmarPagoPayPal}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
              >
                <RefreshCw size={16} />
                Reintentar confirmación del pago
              </button>
            ) : null}
          </div>

          <form
            onSubmit={handleRegistrarPago}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <ReceiptText className="text-slate-700" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">Registrar pago manual</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Si pagaste por transferencia u otro medio, registra la referencia o el enlace del
              comprobante. El propietario lo verificará y la reserva quedará confirmada.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Método de pago
                </span>
                <select
                  value={pagoManual.metodo_pago}
                  onChange={(e) =>
                    setPagoManual((actual) => ({ ...actual, metodo_pago: e.target.value }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="QR">QR</option>
                  <option value="OTRO">Otro</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Referencia
                </span>
                <input
                  value={pagoManual.referencia}
                  onChange={(e) =>
                    setPagoManual((actual) => ({ ...actual, referencia: e.target.value }))
                  }
                  placeholder="Nro. de operación"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Enlace del comprobante
                </span>
                <input
                  type="url"
                  value={pagoManual.comprobante_url}
                  onChange={(e) =>
                    setPagoManual((actual) => ({
                      ...actual,
                      comprobante_url: e.target.value,
                    }))
                  }
                  placeholder="https://... (opcional)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={registrando}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              <FileText size={16} />
              {registrando ? "Registrando pago..." : "Registrar pago para verificación"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ReservationPay;

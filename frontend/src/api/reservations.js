import api from "./client";

export const createReservation = (payload) => api.post("/reservations", payload);
export const getReservations = () => api.get("/reservations");
export const getReservationById = (id) => api.get(`/reservations/${id}`);
export const cancelReservation = (id) => api.post(`/reservations/${id}/cancel`);
export const confirmReservation = (id) => api.post(`/reservations/${id}/confirm`);
export const getReservationAmount = (id) => api.get(`/reservations/${id}/payments/amount`);
export const paypalSimulate = (id) => api.post(`/reservations/${id}/payments/paypal/simulate`);
export const registerPayment = (id, payload) => api.post(`/reservations/${id}/payments`, payload);
export const listPayments = (id) => api.get(`/reservations/${id}/payments`);
export const verifyPayment = (id) => api.post(`/payments/${id}/verify`);

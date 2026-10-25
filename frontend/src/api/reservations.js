import api from "./client";

export const createReservation = (payload) => api.post("/reservations", payload);
export const getReservations = (params) => api.get("/reservations", { params });
export const getReservationById = (id) => api.get(`/reservations/${id}`);
export const cancelReservation = (id) => api.post(`/reservations/${id}/cancel`);
export const confirmReservation = (id) => api.post(`/reservations/${id}/confirm`);
export const getReservationAmount = (id) => api.get(`/reservations/${id}/payments/amount`);
export const paypalSimulate = (id) => api.post(`/reservations/${id}/payments/paypal/simulate`);
export const paypalCapture = (id, payload = {}) =>
  api.post(`/reservations/${id}/payments/paypal/capture`, payload);
export const registerPayment = (id, payload) => api.post(`/reservations/${id}/payments`, payload);
export const listPayments = (id) => api.get(`/reservations/${id}/payments`);
export const verifyPayment = (id, payload = {}) => api.post(`/payments/${id}/verify`, payload);

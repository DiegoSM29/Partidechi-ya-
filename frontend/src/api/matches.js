import api from "./client";

export const createMatch = (payload) => api.post("/matches", payload);
export const getMatches = (params = {}) => api.get("/matches", { params });
export const getMatchById = (id) => api.get(`/matches/${id}`);
export const updateMatch = (id, payload) => api.patch(`/matches/${id}`, payload);
export const deleteMatch = (id) => api.delete(`/matches/${id}`);
export const joinMatch = (id) => api.post(`/matches/${id}/join`);
export const leaveMatch = (id) => api.post(`/matches/${id}/leave`);
export const getMatchParticipants = (id) => api.get(`/matches/${id}/participants`);

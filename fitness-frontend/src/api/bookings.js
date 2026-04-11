import api from "./axios";

export const bookingsApi = {
    create(data) {
        return api.post("/bookings", data);
    },
    cancel(id) {
        return api.delete(`/bookings/${id}`);
    },
    sessionBookings(sessionId) {
        return api.get(`/sessions/${sessionId}/bookings`);
    },
    getPending() {
        return api.get("/bookings/pending");
    },
    approve(id) {
        return api.post(`/bookings/${id}/approve`);
    },
    reject(id) {
        return api.post(`/bookings/${id}/reject`);
    },
};
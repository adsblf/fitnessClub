import api from "./axios";

export const scheduleApi = {
    list(params = {}) {
        return api.get("/schedule", { params });
    },
    get(id) {
        return api.get(`/schedule/${id}`);
    },
    create(data) {
        return api.post("/schedule", data);
    },
    update(id, data) {
        return api.put(`/schedule/${id}`, data);
    },
    cancel(id) {
        return api.post(`/schedule/${id}/cancel`);
    },
    halls() {
        return api.get("/halls");
    },
    trainers() {
        return api.get("/trainers");
    },
};
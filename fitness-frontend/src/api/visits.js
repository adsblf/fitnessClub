import api from "./axios";

export const visitsApi = {
    create(data) {
        return api.post("/visits", data);
    },
    update(id, data) {
        return api.put(`/visits/${id}`, data);
    },
    list(params = {}) {
        return api.get("/visits", { params });
    },
    sessionsWithVisits(params = {}) {
        return api.get("/visits/sessions-with-visits", { params });
    },
};
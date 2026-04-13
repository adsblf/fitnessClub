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
    listFree(params = {}) {
        return api.get("/visits", { params: { ...params, free_only: 1 } });
    },
    sessionsWithVisits(params = {}) {
        return api.get("/visits/sessions-with-visits", { params });
    },
};
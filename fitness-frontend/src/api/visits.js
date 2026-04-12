import api from "./axios";

export const visitsApi = {
    create(data) {
        return api.post("/visits", data);
    },
    list(params = {}) {
        return api.get("/visits", { params });
    },
    sessionsWithVisits(params = {}) {
        return api.get("/visits/sessions-with-visits", { params });
    },
};
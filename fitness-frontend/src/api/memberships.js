import api from "./axios";

export const membershipsApi = {
    types() {
        return api.get("/membership-types");
    },
    list(params = {}) {
        return api.get("/memberships", { params });
    },
    create(data) {
        return api.post("/memberships", data);
    },
    freeze(id, days = 14) {
        return api.post(`/memberships/${id}/freeze`, { days });
    },
    unfreeze(id) {
        return api.post(`/memberships/${id}/unfreeze`);
    },
};
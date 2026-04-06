import api from "./axios";

export const clientsApi = {
    list(params = {}) {
        return api.get("/clients", { params });
    },
    get(id) {
        return api.get(`/clients/${id}`);
    },
    create(data) {
        return api.post("/clients", data);
    },
    update(id, data) {
        return api.put(`/clients/${id}`, data);
    },
    delete(id) {
        return api.delete(`/clients/${id}`);
    },
    memberships(id) {
        return api.get(`/clients/${id}/memberships`);
    },
    visits(id) {
        return api.get(`/clients/${id}/visits`);
    },
};
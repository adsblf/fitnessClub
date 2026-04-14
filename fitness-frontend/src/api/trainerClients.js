import api from "./axios";

export const trainerClientsApi = {
    list() {
        return api.get("/trainer/clients");
    },
    attach(clientId) {
        return api.post("/trainer/clients", { client_id: clientId });
    },
    detach(clientId) {
        return api.delete(`/trainer/clients/${clientId}`);
    },
    get(clientId) {
        return api.get(`/trainer/clients/${clientId}`);
    },
    upsertCard(clientId, data) {
        return api.put(`/trainer/clients/${clientId}/card`, data);
    },
    addMeasurement(clientId, data) {
        return api.post(`/trainer/clients/${clientId}/measurements`, data);
    },
    deleteMeasurement(clientId, measurementId) {
        return api.delete(`/trainer/clients/${clientId}/measurements/${measurementId}`);
    },
};

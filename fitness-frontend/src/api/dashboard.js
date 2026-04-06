import api from "./axios";

export const dashboardApi = {
    index() {
        return api.get("/dashboard");
    },
};
import api from "./axios";

export const membershipApi = {
  types() {
    return api.get("/membership-types");
  },
  calculatePrice(data) {
    return api.post("/memberships/calculate-price", data);
  },
  selfFreeze(id, days) {
    return api.post(`/memberships/${id}/self-freeze`, { days });
  },
  selfUnfreeze(id) {
    return api.post(`/memberships/${id}/self-unfreeze`);
  },
  selfRenew(data) {
    return api.post("/memberships/self-renew", data);
  },
};

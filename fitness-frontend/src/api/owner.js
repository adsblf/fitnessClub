import api from "./axios";

export const ownerApi = {
  // ── Staff ──────────────────────────────────────────────
  listStaff() {
    return api.get("/owner/staff");
  },
  storeStaff(data) {
    return api.post("/owner/staff", data);
  },
  updateStaff(id, data) {
    return api.put(`/owner/staff/${id}`, data);
  },
  destroyStaff(id) {
    return api.delete(`/owner/staff/${id}`);
  },

  // ── Membership types ───────────────────────────────────
  listMembershipTypes() {
    return api.get("/owner/membership-types");
  },
  storeMembershipType(data) {
    return api.post("/owner/membership-types", data);
  },
  updateMembershipType(id, data) {
    return api.put(`/owner/membership-types/${id}`, data);
  },
  destroyMembershipType(id) {
    return api.delete(`/owner/membership-types/${id}`);
  },

  // ── Promo codes ────────────────────────────────────────
  listPromoCodes() {
    return api.get("/owner/promo-codes");
  },
  storePromoCode(data) {
    return api.post("/owner/promo-codes", data);
  },
  updatePromoCode(id, data) {
    return api.put(`/owner/promo-codes/${id}`, data);
  },
  destroyPromoCode(id) {
    return api.delete(`/owner/promo-codes/${id}`);
  },
};

import api from "./axios";

export const productsApi = {
  // ── Owner — категории ──────────────────────────────────
  ownerListCategories() {
    return api.get("/owner/product-categories");
  },
  ownerCreateCategory(data) {
    return api.post("/owner/product-categories", data);
  },
  ownerUpdateCategory(id, data) {
    return api.put(`/owner/product-categories/${id}`, data);
  },
  ownerDestroyCategory(id) {
    return api.delete(`/owner/product-categories/${id}`);
  },

  // ── Owner — каталог ────────────────────────────────────
  ownerList(params = {}) {
    return api.get("/owner/products", { params });
  },
  ownerCreate(data) {
    return api.post("/owner/products", data);
  },
  ownerUpdate(id, data) {
    return api.put(`/owner/products/${id}`, data);
  },
  ownerDestroy(id) {
    return api.delete(`/owner/products/${id}`);
  },
  ownerRestock(id, quantity) {
    return api.post(`/owner/products/${id}/restock`, { quantity });
  },

  // ── Admin — POS ────────────────────────────────────────
  list(params = {}) {
    return api.get("/products", { params });
  },
  createSale(data) {
    return api.post("/product-sales", data);
  },
  listSales(params = {}) {
    return api.get("/product-sales", { params });
  },
  /** items: [{item_id, quantity}] — если не передать, возвращаются все доступные */
  refundSale(id, items = null) {
    const body = items ? { items } : {};
    return api.post(`/product-sales/${id}/refund`, body);
  },
};

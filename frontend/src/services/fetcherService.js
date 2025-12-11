import { api } from "./api";

export const fetchArticles = () => api.get("/api/fetch");
export const startFetch = (payload) => api.post("/api/fetch", payload);

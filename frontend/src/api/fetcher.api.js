// src/api/fetcher.api.js
import api from "./index";

export const startFetch = (source) => {
  return api.post(`/api/start/${source}`);
};

export const getFetchedContent = (params) => {
  return api.get("/api/fetch", { params });
};

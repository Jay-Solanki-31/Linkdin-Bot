// src/api/fetchedContent.api.js
import api from "./index";

export const fetchFetchedContent = (params = {}) =>
  api.get("/api/fetch", { params });

export const triggerAIGeneration = (contentId) =>
  api.post(`/ai/generate/${contentId}`);

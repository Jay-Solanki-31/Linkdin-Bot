// src/api/aiPosts.api.js
import api from "./index";

export const fetchAIPosts = (params = {}) =>
  api.get("/api/ai-posts", { params });

export const updateAIPost = (id, payload) =>
  api.put(`/api/ai-posts/${id}`, payload);

export const deleteAIPost = (id) =>
  api.delete(`/api/ai-posts/${id}`);

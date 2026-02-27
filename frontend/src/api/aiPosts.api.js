// src/api/aiPosts.api.js
import api from "./index";

export const fetchAIPosts = (params = {}) =>
  api.get("/api/ai-posts", { params });

export const deleteAIPost = (id) =>
  api.delete(`/api/ai-posts/${id}`);

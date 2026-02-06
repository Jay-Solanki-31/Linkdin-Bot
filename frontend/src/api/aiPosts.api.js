// src/api/aiPosts.api.js
import api from "./index";

export const fetchAIPosts = (params = {}) =>
  api.get("/api/ai-posts", { params });

export const queueAIPost = (postId) =>
  api.post(`/api/ai-posts/${postId}/queue`);

export const updateAIPost = (postId, payload) =>
  api.put(`/api/ai-posts/${postId}`, payload);

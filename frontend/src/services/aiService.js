import { api } from "./api";

export const getGeneratedPosts = () => api.get("/ai/posts");
export const triggerAIProcessing = () => api.post("/ai/process");

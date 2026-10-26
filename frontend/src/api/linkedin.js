import api from "./index.js";

export function getLinkedInLoginUrl() {
  return api.getUri({ url: "/api/auth/linkedin/login" });
}

export async function getLinkedInStatus() {
  const { data } = await api.get("/api/auth/linkedin/status");
  return data;
}
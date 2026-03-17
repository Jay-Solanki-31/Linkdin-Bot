import api from "./index.js";

export async function getLinkedInStatus() {
  const { data } = await api.get("/api/auth/linkedin/status");
  return data;
}
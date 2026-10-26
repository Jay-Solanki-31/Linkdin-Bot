// src/api/index.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      error.authHandled = true;
      window.dispatchEvent(new CustomEvent("linkedin-auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;

// src/api/dashboard.api.js
import api from "./index";

export const fetchDashboard = () =>
  api.get("/api/dashboard");

import api from "./index";

export async function getAnalyticsPosts() {

  const { data } =
    await api.get("/api/analytics/posts");

  return data;
}

export async function getAnalyticsHistory(
  urn
) {

  const { data } =
    await api.get(
      `/api/analytics/history/${encodeURIComponent(
        urn
      )}`
    );

  return data;
}

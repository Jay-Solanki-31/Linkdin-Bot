export async function fetchAIPosts(page = 1, limit = 5) {
  const res = await fetch(`/api/ai-posts?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch AI posts");
  return res.json();
}

export async function updateAIPost(postId, payload) {
  const res = await fetch(`/api/ai-posts/${postId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Update failed");

  return data.data;
}

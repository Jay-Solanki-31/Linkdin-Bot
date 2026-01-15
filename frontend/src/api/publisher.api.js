export async function postToLinkedIn(postId) {
  const res = await fetch("/api/publisher/generated/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ postId }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to queue LinkedIn post");
  }

  return data;
}

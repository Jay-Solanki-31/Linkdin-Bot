import api from "@/api";

// Detail responses contain a filesystem path; only expose the public uploads URL.
export function postImageUrl(post) {
  const source = post?.imageUrl || post?.imagePath;
  if (!source || typeof source !== "string") return null;
  if (/^https?:\/\//i.test(source)) return source;
  const normalized = source.replaceAll("\\", "/");
  const index = normalized.indexOf("uploads/");
  if (index < 0) return null;
  const base = api.defaults?.baseURL || window.location.origin;
  return new URL("/" + normalized.slice(index), base).href;
}

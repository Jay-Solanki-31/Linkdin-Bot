export async function getLinkedInStatus() {
  const res = await fetch("api/auth/linkedin/status");
  return res.json();
}

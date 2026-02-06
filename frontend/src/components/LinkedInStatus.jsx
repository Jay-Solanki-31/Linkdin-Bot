import { useEffect, useState } from "react";
import { getLinkedInStatus } from "@/api/linkedin";

export default function LinkedInStatus() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    const data = await getLinkedInStatus();
    setAuth(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const connectLinkedIn = () => {
    const popup = window.open(
      "/api/auth/linkedin/login",
      "linkedin-login",
      "width=650,height=700"
    );

    const listener = (event) => {
      if (event.data?.source !== "linkedin-auth") return;
      if (event.data.status === "success") loadStatus();
      window.removeEventListener("message", listener);
      popup?.close();
    };

    window.addEventListener("message", listener);
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground">Checking…</div>;
  }

  if (!auth?.connected || auth?.expired) {
    return (
      <button
        onClick={connectLinkedIn}
        className="px-3 py-1 text-xs rounded bg-blue-600 text-white"
      >
        Connect LinkedIn
      </button>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(auth.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <span className="text-xs text-green-600">
      LinkedIn connected · {daysLeft}d left
    </span>
  );
}

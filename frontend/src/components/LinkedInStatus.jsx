import { useEffect, useState } from "react";

export default function LinkedInStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/linkedin/status")
      .then(res => res.json())
      .then(data => setStatus(data))
      .finally(() => setLoading(false));
  }, []);

  const connectLinkedIn = () => {
    window.location.href = "/api/auth/linkedin/login"; 
  };

  if (loading) return (
    <div className="px-4 py-2 border rounded animate-pulse w-48">
      Checking LinkedIn…
    </div>
  );

  if (!status?.connected || status?.expired) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-3 py-1 text-sm rounded border border-red-400 text-red-600 bg-red-50 dark:bg-red-950">
          Not Connected
        </div>

        <button
          onClick={connectLinkedIn}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Connect LinkedIn
        </button>
      </div>
    );
  }

  // connected
  const expires = new Date(status.expiresAt);
  const remainingDays = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex items-center gap-3">
      <div className="px-3 py-1 text-sm rounded border border-green-400 text-green-700 bg-green-50 dark:bg-green-900">
        Connected ✓
      </div>

      <span className="text-sm text-slate-600 dark:text-slate-300">
        Expires in <b>{remainingDays}</b> days
      </span>
    </div>
  );
}

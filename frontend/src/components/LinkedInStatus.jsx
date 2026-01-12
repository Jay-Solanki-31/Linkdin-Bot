import { useEffect, useState } from "react";

export default function LinkedInStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshStatus = async () => {
    setLoading(true);
    const res = await fetch("/api/auth/linkedin/status");
    const data = await res.json();
    setStatus(data);
    setLoading(false);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const connectLinkedIn = () => {
    const popup = window.open(
      "/api/auth/linkedin/login",
      "linkedin-login",
      "width=650,height=700"
    );

    if (!popup) {
      alert("Popup blocked! Enable popups.");
      return;
    }

    const listener = (event) => {
      if (!event.data || event.data.source !== "linkedin-auth") return;

      if (event.data.status === "success") refreshStatus();

      window.removeEventListener("message", listener);
      popup.close();
    };

    window.addEventListener("message", listener);
  };


  if (loading) return (
    <div className="px-3 py-1.5 border border-border/40 rounded-lg text-sm text-muted-foreground animate-pulse">
      Checking…
    </div>
  );

  if (!status?.connected || status?.expired) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-2.5 py-1 text-xs font-medium rounded-md border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30">
          Not Connected
        </div>
        <button
          onClick={connectLinkedIn}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors duration-200"
        >
          Connect
        </button>
      </div>
    );
  }

  // connected
  const expires = new Date(status.expiresAt);
  const remainingDays = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex items-center gap-2">
      <div className="px-2.5 py-1 text-xs font-medium rounded-md border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
        Connected ✓
      </div>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {remainingDays}d left
      </span>
    </div>
  );
}

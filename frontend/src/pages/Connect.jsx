import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
export default function Connect() {
  const { connect, status, auth, refresh } = useAuth();
  const location = useLocation(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const from = location.state?.from;
  const destination =
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    from !== "/connect"
      ? from
      : "/";
  async function handleConnect() {
    setBusy(true);
    setError("");
    try {
      await connect();
      navigate(destination, { replace: true });
    } catch (e) {
      setError(e.message || "Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (status === "authenticated") return <Navigate to={destination} replace />;
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between bg-[#172b67] text-white p-12 xl:p-20">
        <div className="font-semibold text-xl">
          in✦ <span className="ml-2">LinkedIn Bot</span>
        </div>
        <div>
          <p className="text-xs tracking-[.2em] text-blue-200 mb-6">
            YOUR CONTENT. YOUR VOICE.
          </p>
          <h1 className="text-5xl leading-tight tracking-tight font-semibold max-w-lg">
            A thoughtful presence.
            <br />
            One post at a time.
          </h1>
          <p className="text-blue-100 leading-7 mt-6 max-w-md">
            Collect inspiration, turn ideas into drafts, and build a publishing
            rhythm that works for you.
          </p>
          <div className="mt-10 border border-white/20 rounded-xl p-6 max-w-md">
            <p className="text-sm text-blue-100">01 &nbsp; Find inspiration</p>
            <p className="text-sm text-blue-100 my-4">
              02 &nbsp; Create with your perspective
            </p>
            <p className="text-sm text-blue-100">
              03 &nbsp; Share at the right moment
            </p>
          </div>
        </div>
        <p className="text-xs text-blue-200">
          A workspace for your professional voice.
        </p>
      </section>
      <section className="relative flex flex-col justify-center px-6 py-20 sm:px-16">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md mx-auto">
          <div className="avatar mb-8">in</div>
          <p className="eyebrow">WELCOME TO YOUR WORKSPACE</p>
          <h2 className="text-3xl tracking-tight font-semibold mt-3">
            Connect LinkedIn
          </h2>
          <p className="text-sm text-muted-foreground leading-7 mt-4">
            {auth?.expired
              ? "Your session has expired. Reconnect to continue with your account."
              : "Connect your account to access your content, drafts, and publishing calendar."}
          </p>
          <Button
            className="w-full mt-8"
            disabled={busy || status === "loading"}
            onClick={handleConnect}
          >
            {status === "loading"
              ? "Checking your session…"
              : busy
                ? "Connecting…"
                : "Connect LinkedIn →"}
          </Button>
          {status === "error" && (
            <Button variant="outline" className="mt-3 w-full" onClick={refresh}>
              Retry session check
            </Button>
          )}
          {error && (
            <p className="text-sm text-destructive mt-4" role="alert">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground leading-6 mt-6">
            A secure LinkedIn window will open to authorize your account. Review
            drafts before publishing manually. Automatic posting follows your
            account preferences.
          </p>
        </div>
      </section>
    </div>
  );
}


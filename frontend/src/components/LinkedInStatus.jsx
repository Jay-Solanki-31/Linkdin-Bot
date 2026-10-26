import { useAuth } from "@/auth/AuthContext";
import { Link } from "react-router-dom";
export default function LinkedInStatus() {
  const { auth, status } = useAuth();
  if (status === "loading")
    return (
      <span className="text-xs text-muted-foreground">
        Checking connection…
      </span>
    );
  if (status !== "authenticated")
    return (
      <Link to="/connect" className="text-xs text-primary">
        Connect LinkedIn
      </Link>
    );
  const days = auth?.expiresAt
    ? Math.max(0, Math.ceil((new Date(auth.expiresAt) - new Date()) / 86400000))
    : null;
  return (
    <span className="inline-flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full bg-current"
      />
      LinkedIn connected{days === null ? "" : " · " + days + "d left"}
    </span>
  );
}
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute() {
  const { status, error, refresh } = useAuth();
  const location = useLocation();
  if (status === "loading") return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Checking your LinkedIn connection...</div>;
  if (status === "error") return <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center"><p className="text-sm text-red-600">Unable to check your LinkedIn connection.</p><p className="text-xs text-muted-foreground">{error?.response?.data?.message || "The backend may be temporarily unavailable."}</p><button className="rounded bg-blue-600 px-3 py-2 text-sm text-white" onClick={refresh}>Retry</button></div>;
  if (status !== "authenticated") return <Navigate to="/connect" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}


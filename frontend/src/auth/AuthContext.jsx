import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { getLinkedInLoginUrl, getLinkedInStatus } from "@/api/linkedin";

const AuthContext = createContext(null);
let statusRequest;

function isConnected(data) {
  return Boolean(data?.connected && !data?.expired);
}

async function requestStatus() {
  if (!statusRequest) {
    statusRequest = getLinkedInStatus().finally(() => {
      statusRequest = undefined;
    });
  }
  return statusRequest;
}

export function AuthProvider({ children }) {
  const revision = useRef(0);
  const unauthorizedShown = useRef(false);
  const [auth, setAuth] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const requestRevision = ++revision.current;
    setAuth(null);
    setStatus("loading");
    setError(null);
    try {
      const data = await requestStatus();
      if (requestRevision !== revision.current) return null;
      unauthorizedShown.current = false;
      setAuth(isConnected(data) ? data : null);
      setStatus(isConnected(data) ? "authenticated" : "unauthenticated");
      return data;
    } catch (requestError) {
      if (requestRevision !== revision.current) return null;
      setAuth(null);
      setError(requestError);
      setStatus("error");
      return null;
    }
  }, []);

  const clearAuth = useCallback((message) => {
    revision.current++;
    statusRequest = undefined;
    setAuth(null);
    setStatus("unauthenticated");
    setError(null);
    if (message) toast.error(message);
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);
    const handleUnauthorized = () => {
      if (unauthorizedShown.current) return;
      unauthorizedShown.current = true;
      revision.current++;
      statusRequest = undefined;
      setAuth(null);
      setStatus("unauthenticated");
      setError(null);
      toast.error(
        "Your session has expired. Please reconnect your LinkedIn account.",
      );
    };
    window.addEventListener("linkedin-auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener(
        "linkedin-auth:unauthorized",
        handleUnauthorized,
      );
  }, [refresh]);

  const connect = useCallback(async () => {
    const loginUrl = getLinkedInLoginUrl();
    const popup = window.open(
      loginUrl,
      "linkedin-login",
      "width=650,height=700",
    );
    if (!popup)
      throw new Error(
        "The LinkedIn popup was blocked. Allow popups and try again.",
      );
    const expectedOrigin = new URL(loginUrl).origin;
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        window.removeEventListener("message", listener);
        clearInterval(closedTimer);
        clearTimeout(timeout);
      };
      const listener = (event) => {
        if (event.origin !== expectedOrigin || event.source !== popup) return;
        if (event.data?.source !== "linkedin-auth") return;
        cleanup();
        popup.close();
        if (event.data.status === "success") resolve();
        else
          reject(
            new Error(event.data.message || "LinkedIn authorization failed."),
          );
      };
      window.addEventListener("message", listener);
      const closedTimer = setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(
            new Error("LinkedIn authorization was closed. Please try again."),
          );
        }
      }, 500);
      const timeout = setTimeout(() => {
        cleanup();
        popup.close();
        reject(
          new Error("LinkedIn authorization timed out. Please try again."),
        );
      }, 300000);
    });
    statusRequest = undefined;
    const data = await refresh();
    if (!isConnected(data))
      throw new Error(
        "LinkedIn connected, but account status could not be refreshed.",
      );
    return data;
  }, [refresh]);

  const value = useMemo(
    () => ({
      auth,
      account: auth,
      status,
      error,
      isAuthenticated: status === "authenticated",
      refresh,
      connect,
      clearAuth,
    }),
    [auth, status, error, refresh, connect, clearAuth],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The provider and its consumer hook intentionally share a module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

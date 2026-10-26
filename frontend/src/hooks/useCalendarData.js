import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/api";
import { useAuth } from "@/auth/AuthContext";

const REFRESH_MS = 45000;

export default function useCalendarData() {
  const { isAuthenticated, auth } = useAuth();
  const owner = auth?.memberUrn || auth?.linkedinMemberUrn;
  const [snapshot, setSnapshot] = useState(null);
  const refreshRef = useRef(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    if (!isAuthenticated || !owner) return;
    let active = true;
    let inFlight = false;
    let suspended = false;
    let timer;
    let controller;
    let timezone;
    const visible = () => document.visibilityState !== "hidden";
    const update = (changes) => {
      if (active)
        setSnapshot((previous) => ({
          ...(previous?.owner === owner ? previous : { owner, posts: null }),
          ...changes,
        }));
    };
    const schedule = () => {
      clearTimeout(timer);
      if (active && !suspended && visible())
        timer = setTimeout(load, REFRESH_MS);
    };
    async function load() {
      if (!active || suspended || inFlight || !visible()) return;
      clearTimeout(timer);
      inFlight = true;
      controller = new AbortController();
      const signal = controller.signal;
      update({ refreshing: true });
      try {
        if (!timezone) {
          const { data } = await api.get("/api/automation/settings", {
            signal,
          });
          timezone = data.timezone || "Asia/Kolkata";
        }
        let posts = [],
          page = 1,
          totalPages = 1;
        do {
          if (!active || signal.aborted || !visible()) return;
          const { data } = await api.get("/api/ai-posts", {
            params: { page, limit: 50 },
            signal,
          });
          posts = posts.concat(data.data || []);
          totalPages = data.pagination?.totalPages || 1;
          page++;
        } while (page <= totalPages);
        if (!signal.aborted)
          update({ posts, timezone, error: "", lastUpdated: new Date() });
      } catch (error) {
        if (!signal.aborted && active) {
          suspended = Boolean(
            error.authHandled || error.response?.status === 401,
          );
          update({
            error: suspended
              ? "Your session has expired. Reconnect LinkedIn to continue."
              : "Could not refresh your calendar. Your last loaded posts are still shown.",
            suspended,
          });
        }
      } finally {
        inFlight = false;
        update({ refreshing: false });
        if (signal.aborted && visible() && active) timer = setTimeout(load, 0);
        else schedule();
      }
    }
    const onVisibility = () => {
      clearTimeout(timer);
      if (visible()) load();
      else controller?.abort();
    };
    refreshRef.current = load;
    document.addEventListener("visibilitychange", onVisibility);
    load();
    return () => {
      active = false;
      clearTimeout(timer);
      controller?.abort();
      refreshRef.current = () => {};
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated, owner]);

  const current =
    isAuthenticated && snapshot?.owner === owner ? snapshot : null;
  return {
    posts: current?.posts ?? null,
    timezone: current?.timezone || "Asia/Kolkata",
    error: current?.error || "",
    refreshing: Boolean(current?.refreshing),
    lastUpdated: current?.lastUpdated,
    suspended: Boolean(current?.suspended),
    refresh,
  };
}

import { useEffect, useState } from "react";
import api from "@/api";
import { useAuth } from "@/auth/AuthContext";
import LinkedInStatus from "@/components/LinkedInStatus";
import {
  PageHeader,
  LoadingSkeleton,
  ErrorState,
  ConfirmationDialog,
} from "@/components/WorkspaceUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function Settings() {
  const { isAuthenticated, auth, connect } = useAuth();
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  async function reconnect() {
    setBusy(true);
    setError("");
    try {
      await connect();
    } catch (e) {
      setError(e.message || "Could not reconnect LinkedIn.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    api
      .get("/api/automation/settings")
      .then((r) => {
        if (active) {
          setSettings(r.data);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("Unable to load automation settings.");
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, auth?.memberUrn, retry]);
  async function save() {
    setBusy(true);
    try {
      const { data } = await api.patch("/api/automation/settings", {
        automationEnabled: settings.automationEnabled,
        timezone: settings.timezone,
      });
      setSettings((s) => ({ ...s, ...data }));
      setMessage("Your automation preferences have been saved.");
      setConfirm(false);
      setError("");
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Could not save settings. Please try again.",
      );
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6 settings-page">
      <PageHeader
        title="Make it work your way."
        eyebrow="SETTINGS"
        description="Manage your connection, publishing preferences, and weekly workflow."
      />
      {error && (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      )}
      <p role="status" className="text-sm text-primary">
        {message}
      </p>
      {!settings ? (
        !error && <LoadingSkeleton />
      ) : (
        <>
          <section className="surface p-6">
            <h2 className="section-title mb-3">LinkedIn connection</h2>
            <LinkedInStatus />
            <p className="text-sm text-muted-foreground mt-3">
              This workspace uses your authenticated LinkedIn session.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              To use another account, reconnect and authorize that account in
              LinkedIn. Disconnect is not available in this version.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              disabled={busy}
              onClick={reconnect}
            >
              {busy ? "Connecting…" : "Reconnect LinkedIn"}
            </Button>
          </section>
          <section className="surface p-6 space-y-6 max-w-3xl">
            <div>
              <h2 className="section-title">Automatic posting</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Choose whether this account participates in the existing weekly
                automation.
              </p>
            </div>
            <label className="flex items-center justify-between gap-4 text-sm font-medium">
              <span>Enable automatic posting</span>
              <input
                type="checkbox"
                role="switch"
                className="h-5 w-5 accent-blue-600"
                checked={settings.automationEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    automationEnabled: e.target.checked,
                  })
                }
              />
            </label>
            <label className="field">
              Default timezone
              <Input
                value={settings.timezone}
                onChange={(e) =>
                  setSettings({ ...settings, timezone: e.target.value })
                }
                placeholder="Asia/Kolkata"
              />
              <span className="block text-xs text-muted-foreground mt-2">
                Use an IANA timezone such as Asia/Kolkata or America/New_York.
              </span>
            </label>
            <div className="rounded-lg bg-muted p-4 text-sm leading-7">
              <h3 className="font-medium">Your weekly workflow</h3>
              <p className="text-muted-foreground">{settings.schedule}</p>
              <p className="text-muted-foreground mt-2">
                Timezone preferences do not change the existing weekly
                automation schedule. Disabling automation preserves posts
                already queued.
              </p>
            </div>
            <Button
              disabled={busy || !settings.timezone.trim()}
              onClick={() => setConfirm(true)}
            >
              Save preferences
            </Button>
          </section>
        </>
      )}
      {confirm && (
        <ConfirmationDialog
          title="Update automation preferences?"
          description={
            settings.automationEnabled
              ? "Future weekly runs may automatically generate and publish posts for this account. Existing scheduled posts remain scheduled."
              : "Future automatic posting will be disabled. Posts already queued remain scheduled."
          }
          confirmLabel="Save preferences"
          onClose={() => setConfirm(false)}
          onConfirm={save}
          busy={busy}
        />
      )}
    </div>
  );
}

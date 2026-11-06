import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api from "@/api";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog, LoadingSkeleton } from "@/components/WorkspaceUI";

export default function AIWritingPreferences() {
  const { auth, isAuthenticated } = useAuth();
  const account = isAuthenticated ? auth?.memberUrn : null;
  // Remount all local state and cancel requests whenever account identity changes.
  return account ? <PreferencesForm key={account} /> : null;
}

function PreferencesForm() {
  const [loaded, setLoaded] = useState(null);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState("");
  const [topic, setTopic] = useState("");
  const [tag, setTag] = useState("");
  const [reset, setReset] = useState(false);
  const [retry, setRetry] = useState(0);
  const alive = useRef(false);
  const pending = useRef(false);
  const previewPending = useRef(false);
  const controller = useRef(null);
  useEffect(() => {
    alive.current = true;
    const abort = new AbortController();
    controller.current = abort;
    api
      .get("/api/ai-writing-preferences", { signal: abort.signal })
      .then(({ data }) => {
        if (!abort.signal.aborted) {
          setLoaded(data);
          setForm(data.preferences);
          setSaved(data.preferences);
          setError("");
        }
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setError("Unable to load AI writing preferences.");
      });
    return () => {
      alive.current = false;
      abort.abort();
    };
  }, [retry]);
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const invalid =
    form && (form.customInstructions.length > 2000 || form.topics.length > 10);
  async function save() {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError("");
    const values = form;
    try {
      const { data } = await api.put(
        "/api/ai-writing-preferences",
        { preferences: values, revision: loaded.revision },
        { signal: controller.current.signal },
      );
      if (!alive.current) return;
      setLoaded((l) => ({ ...l, revision: data.revision }));
      setSaved(data.preferences);
      toast.success("AI writing preferences saved.");
    } catch (e) {
      if (!alive.current) return;
      const message =
        e.response?.data?.message ||
        "Could not save preferences. Your changes are preserved.";
      setError(message);
      toast.error(message);
    } finally {
      pending.current = false;
      if (alive.current) setSaving(false);
    }
  }
  async function generatePreview() {
    if (previewPending.current) return;
    previewPending.current = true;
    setPreviewing(true);
    setError("");
    setPreview("");
    try {
      const { data } = await api.post(
        "/api/ai-writing-preferences/preview",
        { preferences: form, topic },
        { signal: controller.current.signal },
      );
      if (alive.current) setPreview(data.text);
    } catch (e) {
      if (alive.current)
        setError(
          e.response?.data?.message || "Preview unavailable. Please try again.",
        );
    } finally {
      previewPending.current = false;
      if (alive.current) setPreviewing(false);
    }
  }
  function addTag() {
    const value = tag.trim();
    if (!value || value.length > 80 || form.topics.length >= 10) return;
    change("topics", [...new Set([...form.topics, value])]);
    setTag("");
  }
  return (
    <section className="surface p-4 sm:p-6 space-y-5 max-w-3xl min-w-0">
      <div>
        <h2 className="section-title">AI Writing Preferences</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Customize how AI writes your LinkedIn posts.
        </p>
      </div>
      {error && (
        <div role="alert" className="text-sm text-destructive">
          {error}
          {!form && (
            <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
              Retry
            </Button>
          )}
        </div>
      )}
      {!form ? (
        !error && <LoadingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ["tone", "Writing Tone"],
              ["length", "Post Length"],
              ["emoji", "Emoji Usage"],
              ["language", "Language"],
            ].map(([key, label]) => (
              <label className="field" key={key}>
                {label}
                <select
                  className="w-full rounded-md border border-input bg-background p-2 text-sm"
                  value={form[key]}
                  onChange={(e) => change(key, e.target.value)}
                >
                  {loaded.options[key].map((value) => (
                    <option key={value} value={value}>
                      {{
                        en: "English",
                        hi: "Hindi",
                        es: "Spanish",
                        fr: "French",
                        de: "German",
                        pt: "Portuguese",
                      }[value] || value[0].toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Short: 60–100 words · Medium: 100–160 · Long: 160–180
          </p>
          <label className="flex items-center justify-between gap-4 text-sm">
            Hashtags
            <input
              type="checkbox"
              role="switch"
              checked={form.hashtags}
              onChange={(e) => change("hashtags", e.target.checked)}
            />
          </label>
          <div className="space-y-2">
            <label htmlFor="writing-topic-tag" className="field">
              Preferred Topics ({form.topics.length}/10)
            </label>
            <div className="flex gap-2">
              <Input
                id="writing-topic-tag"
                placeholder="Node.js, Backend Engineering, AI…"
                value={tag}
                maxLength={80}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button
                variant="outline"
                disabled={!tag.trim() || form.topics.length >= 10}
                onClick={addTag}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.topics.map((t) => (
                <Button
                  key={t}
                  variant="outline"
                  className="max-w-full whitespace-normal break-words"
                  aria-label={`Remove ${t}`}
                  onClick={() =>
                    change(
                      "topics",
                      form.topics.filter((x) => x !== t),
                    )
                  }
                >
                  {t} ×
                </Button>
              ))}
            </div>
          </div>
          <label className="field block">
            Custom Instructions
            <textarea
              className="mt-2 w-full min-h-28 rounded-md border border-input bg-background p-3 text-sm"
              value={form.customInstructions}
              maxLength={2000}
              placeholder="Write practical engineering insights with real-world examples. Avoid generic motivational content."
              onChange={(e) => change("customInstructions", e.target.value)}
            />
            <span className="text-xs text-muted-foreground">
              {form.customInstructions.length}/2000 characters
            </span>
          </label>
          {invalid && <p role="alert">Check instructions and topic limits.</p>}
          <p role="status" className="text-sm text-muted-foreground">
            {dirty ? "Unsaved changes" : "No unsaved changes"}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={saving || !dirty || invalid} onClick={save}>
              {saving ? "Saving…" : "Save writing preferences"}
            </Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setReset(true)}
            >
              Reset to Defaults
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Changes apply to new generation attempts. Existing post text stays
            as saved. Save the defaults to apply them to future posts.
          </p>
          <div className="border-t pt-4 space-y-3">
            <label className="field block">
              Preview Topic
              <Input
                value={topic}
                maxLength={2000}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Why Redis caching can cause stale data"
              />
            </label>
            <Button
              variant="outline"
              disabled={previewing || !topic.trim() || invalid}
              onClick={generatePreview}
            >
              {previewing ? "Generating preview…" : "Generate Preview"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Uses unsaved values. Preview only; nothing is saved or published.
            </p>
            {preview && (
              <div className="space-y-3">
                <h3 className="font-medium">Generated Preview</h3>
                <p className="whitespace-pre-wrap break-words text-sm leading-7">
                  {preview}
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(preview);
                      toast.success("Text copied.");
                    } catch {
                      toast.error("Could not copy text.");
                    }
                  }}
                >
                  Copy Text
                </Button>
              </div>
            )}
          </div>
        </>
      )}
      {reset && (
        <ConfirmationDialog
          title="Reset AI writing preferences?"
          description="Restore defaults in this form. Save to apply them to future generation."
          confirmLabel="Reset to Defaults"
          onClose={() => setReset(false)}
          onConfirm={() => {
            setForm({
              ...loaded.defaults,
              topics: [...loaded.defaults.topics],
            });
            setReset(false);
          }}
        />
      )}
    </section>
  );
}

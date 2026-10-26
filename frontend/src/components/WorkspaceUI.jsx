import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { postImageUrl } from "@/lib/postImage";
export function PageHeader({
  eyebrow = "YOUR WORKSPACE",
  title,
  description,
  children,
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-xl">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
export function StatCard({ label, value, detail }) {
  return (
    <div className="surface stat-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tracking-tight mt-3">
        {value ?? "—"}
      </p>
      <p className="text-xs text-muted-foreground mt-3">{detail}</p>
    </div>
  );
}
export function EmptyState({
  title = "Nothing here yet",
  description,
  children,
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">
        ＋
      </span>
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 mb-5">
        {description}
      </p>
      {children}
    </div>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="surface p-6 border-destructive/40">
      <h2 className="font-semibold">We couldn’t load this view</h2>
      <p className="text-sm text-muted-foreground my-3">
        {message || "Please try again in a moment."}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading content" className="space-y-4">
      <div className="h-12 w-1/2 rounded-lg bg-muted animate-pulse" />
      <div className="grid sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-muted animate-pulse" />
    </div>
  );
}
export function PostStatus({ status }) {
  const variant =
    {
      posted: "success",
      queued: "warning",
      publishing: "info",
      generating: "info",
      failed: "error",
      review_required: "error",
      draft: "default",
    }[status] || "default";
  return (
    <StatusBadge variant={variant}>
      {(status || "draft").replaceAll("_", " ")}
    </StatusBadge>
  );
}
export function Dialog({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="workspace-dialog"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        <Button
          autoFocus
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onClose}
          aria-label="Close dialog"
        >
          ✕
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function ConfirmationDialog({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
  busy,
}) {
  return (
    <Dialog title={title} onClose={onClose} busy={busy}>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      <div className="dialog-actions flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={busy}>
          {busy ? "Saving…" : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
export function PostPreview({ post, name = "Your LinkedIn account" }) {
  const image = postImageUrl(post);
  return (
    <article className="surface overflow-hidden">
      <div className="p-5 flex gap-3 items-center">
        <div className="avatar">in</div>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">LinkedIn post preview</p>
        </div>
      </div>
      <p className="px-5 pb-5 whitespace-pre-wrap text-sm leading-7 break-words">
        {post?.text ||
          "Your draft will appear here. Start with an idea, then make it your own."}
      </p>
      {image && (
        <img
          className="w-full max-h-80 object-contain bg-muted"
          src={image}
          alt="Generated post illustration"
        />
      )}
      <div className="border-t px-5 py-4 text-xs text-muted-foreground">
        Preview only. Publishing requires your confirmation.
      </div>
    </article>
  );
}
export function DateRangeFilter({ value, onChange }) {
  return (
    <label className="date-range-filter text-xs text-muted-foreground">
      Date range
      <select
        className="ml-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">All available</option>
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
      </select>
    </label>
  );
}

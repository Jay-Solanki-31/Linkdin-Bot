import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import useCalendarData from "@/hooks/useCalendarData";
import useMediaQuery from "@/hooks/useMediaQuery";
import { dateKey, wallDate, wallKey } from "@/lib/calendar";
import {
  PageHeader,
  EmptyState,
  LoadingSkeleton,
  PostStatus,
} from "@/components/WorkspaceUI";
import { Button } from "@/components/ui/button";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const filters = [
  ["all", "All"],
  ["queued", "Scheduled"],
  ["posted", "Published"],
  ["failed", "Failed"],
  ["review_required", "Review Required"],
];

function Agenda({ posts, timezone, title, filtered }) {
  return (
    <section className="surface calendar-agenda" aria-label={title}>
      <div className="p-5 border-b">
        <h2 className="section-title">{title}</h2>
      </div>
      {!posts.length ? (
        <EmptyState
          title="A little breathing room"
          description={
            filtered
              ? "No posts match this status in the selected period. Try another filter or date."
              : "No dated posts in this period. Plan a post in Studio, or choose another date."
          }
        />
      ) : (
        <ul>
          {posts.map((post) => (
            <li className="calendar-post" key={post._id}>
              <div className="flex flex-wrap items-center gap-2">
                <PostStatus status={post.status} />
                <span className="text-xs text-muted-foreground">
                  {post.creationMode === "manual" ? "Manual" : "Automatic"}
                  {post.testMode ? " · Test only" : ""}
                </span>
              </div>
              <h3 className="text-sm font-semibold leading-6">
                <Link to={"/studio?postId=" + post._id}>
                  {post.title || post.topic || "Untitled post"}
                </Link>
              </h3>
              <time
                dateTime={post.publishAt}
                className="text-sm text-muted-foreground"
              >
                {new Date(post.publishAt).toLocaleString(undefined, {
                  timeZone: timezone,
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              {post.status === "review_required" && (
                <p className="text-xs text-destructive">
                  Check LinkedIn before taking further action. The publishing
                  outcome needs review.
                </p>
              )}
              {post.status === "failed" && (
                <p className="text-xs text-destructive">
                  Processing failed. Open the post to review its status.
                </p>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link to={"/studio?postId=" + post._id}>
                  {post.status === "queued" ? "View / reschedule" : "View post"}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
export default function Calendar() {
  const {
    posts,
    timezone,
    error,
    refreshing,
    lastUpdated,
    suspended,
    refresh,
  } = useCalendarData();
  const desktop = useMediaQuery("(min-width: 768px)");
  const [chosenView, setChosenView] = useState(null);
  const view = chosenView || (desktop ? "month" : "agenda");
  const [selectedDay, setSelectedDay] = useState(null);
  const [now] = useState(() => new Date());
  const [filter, setFilter] = useState("all");
  const today = dateKey(now, timezone);
  const selected = selectedDay || today;
  const anchor = wallDate(selected);
  const year = anchor.getFullYear(),
    month = anchor.getMonth();
  const monthLabel = anchor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const monthPrefix = selected.slice(0, 7);
  const dates = Array.from(
    { length: new Date(year, month + 1, 0).getDate() },
    (_, i) => wallKey(new Date(year, month, i + 1, 12)),
  );
  const start = wallDate(selected);
  start.setDate(start.getDate() - start.getDay());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return wallKey(d);
  });
  const dated = (posts || []).filter(
    (p) =>
      p.publishAt &&
      Number.isFinite(new Date(p.publishAt).getTime()) &&
      ["queued", "publishing", "posted", "failed", "review_required"].includes(
        p.status,
      ),
  );
  const filtered = dated
    .filter((p) => filter === "all" || p.status === filter)
    .sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt));
  const byDay = new Map();
  filtered.forEach((post) => {
    const key = dateKey(post.publishAt, timezone);
    byDay.set(key, [...(byDay.get(key) || []), post]);
  });
  const monthPosts = filtered.filter((p) =>
    dateKey(p.publishAt, timezone).startsWith(monthPrefix),
  );
  const weekPosts = filtered.filter((p) =>
    week.includes(dateKey(p.publishAt, timezone)),
  );
  const dayPosts = byDay.get(selected) || [];
  const moveMonth = (delta) =>
    setSelectedDay(wallKey(new Date(year, month + delta, 1, 12)));
  function moveWeek(delta) {
    const d = wallDate(selected);
    d.setDate(d.getDate() + 7 * delta);
    setSelectedDay(wallKey(d));
  }
  const fullDate = (key) =>
    wallDate(key).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  function dayButton(key, compact = false) {
    const count = byDay.get(key)?.length || 0;
    return (
      <button
        type="button"
        className={`calendar-day ${compact ? "compact" : ""} ${key === selected ? "selected" : ""}`}
        aria-pressed={key === selected}
        aria-current={key === today ? "date" : undefined}
        aria-label={
          fullDate(key) + ", " + count + (count === 1 ? " post" : " posts")
        }
        onClick={() => setSelectedDay(key)}
      >
        <span>{wallDate(key).getDate()}</span>
        {compact ? (
          <span className="calendar-dot" aria-hidden="true">
            {count ? "•" : ""}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {count ? count + " posts" : ""}
          </span>
        )}
      </button>
    );
  }
  return (
    <div className="space-y-6 calendar-page">
      <PageHeader
        title="A little planning goes a long way."
        eyebrow="PUBLISHING CALENDAR"
        description="Your publishing plan, in your preferred timezone."
      >
        <Button asChild>
          <Link to="/studio">＋ Plan a post</Link>
        </Button>
      </PageHeader>
      <section
        className="surface calendar-toolbar"
        aria-label="Calendar controls"
      >
        <div className="calendar-month-nav">
          <Button
            aria-label="Previous month"
            variant="outline"
            size="icon"
            onClick={() => moveMonth(-1)}
          >
            <ChevronLeft />
          </Button>
          <h2 className="section-title" aria-live="polite">
            {monthLabel}
          </h2>
          <Button
            aria-label="Next month"
            variant="outline"
            size="icon"
            onClick={() => moveMonth(1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div
          className="calendar-view-switch"
          role="group"
          aria-label="Calendar view"
        >
          {["agenda", "week", "month"].map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              aria-pressed={view === v}
              onClick={() => setChosenView(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
        <div className="calendar-freshness">
          <span className="text-xs text-muted-foreground break-words">
            {timezone}
            <span className="block mt-1" role="status">
              {refreshing
                ? "Updating…"
                : lastUpdated
                  ? "Updated " +
                    lastUpdated.toLocaleTimeString(undefined, {
                        timeZone: timezone,
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Not yet updated"}
            </span>
          </span>
          <Button
            size="sm"
            variant="outline"
            aria-label="Refresh calendar"
            disabled={refreshing || suspended}
            onClick={refresh}
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        <label className="calendar-filter field">
          Post status
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {filters.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>
      {error && (
        <div
          className="rounded-xl border border-destructive/30 bg-card p-4 text-sm"
          role="status"
        >
          <p>
            {posts
              ? error
              : suspended
                ? error
                : "Your calendar could not be loaded. Please try again."}
          </p>
          {!suspended && (
            <Button
              className="mt-3"
              variant="outline"
              disabled={refreshing}
              onClick={refresh}
            >
              Try again
            </Button>
          )}
        </div>
      )}
      {!posts ? (
        !error && <LoadingSkeleton />
      ) : (
        <>
          {view === "week" && (
            <section
              className="surface p-3 sm:p-5"
              aria-label="Weekly publishing calendar"
            >
              <div className="flex items-center justify-between gap-2 mb-4">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Previous week"
                  onClick={() => moveWeek(-1)}
                >
                  <ChevronLeft />
                </Button>
                <h2 className="text-xs text-center font-medium">
                  {wallDate(week[0]).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  –{" "}
                  {wallDate(week[6]).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </h2>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Next week"
                  onClick={() => moveWeek(1)}
                >
                  <ChevronRight />
                </Button>
              </div>
              <div className="calendar-week-strip">
                {week.map((key, i) => (
                  <div key={key} className="min-w-0 text-center">
                    <span
                      className="text-[10px] text-muted-foreground"
                      aria-hidden="true"
                    >
                      {weekdays[i]}
                    </span>
                    {dayButton(key, true)}
                  </div>
                ))}
              </div>
            </section>
          )}
          {view === "month" && (
            <section
              className="surface overflow-hidden"
              aria-label="Monthly publishing calendar"
            >
              <div className="grid grid-cols-7 bg-muted/40">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="py-3 text-[10px] sm:text-xs text-muted-foreground text-center border-b"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from(
                  { length: new Date(year, month, 1).getDay() },
                  (_, i) => (
                    <div
                      key={"blank" + i}
                      aria-hidden="true"
                      className="bg-muted/20 border-b border-r"
                    />
                  ),
                )}
                {dates.map((key) => (
                  <div key={key} className="calendar-month-cell">
                    {dayButton(key, !desktop)}
                    {desktop &&
                      (byDay.get(key) || []).map((post) => (
                        <Link
                          key={post._id}
                          to={"/studio?postId=" + post._id}
                          className="calendar-grid-post"
                        >
                          <span>
                            {new Date(post.publishAt).toLocaleTimeString(
                              undefined,
                              {
                                timeZone: timezone,
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                          <span className="block line-clamp-2 font-medium mt-1">
                            {post.title || "Untitled post"}
                          </span>
                          <span className="block mt-1">
                            {post.status.replaceAll("_", " ")} ·{" "}
                            {post.creationMode === "manual"
                              ? "Manual"
                              : "Automatic"}
                          </span>
                        </Link>
                      ))}
                  </div>
                ))}
              </div>
            </section>
          )}
          <Agenda
            posts={
              view === "agenda"
                ? monthPosts
                : view === "week"
                  ? weekPosts
                  : desktop
                    ? monthPosts
                    : dayPosts
            }
            timezone={timezone}
            filtered={filter !== "all"}
            title={
              view === "agenda" || (view === "month" && desktop)
                ? "This month’s publishing agenda"
                : view === "week"
                  ? "This week’s publishing agenda"
                  : fullDate(selected)
            }
          />
          <p className="text-xs text-muted-foreground leading-5">
            Statuses update every 45 seconds while this page is visible. Posts
            without a publishing date are available in{" "}
            <Link className="text-primary underline" to="/posts">
              AI Posts
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

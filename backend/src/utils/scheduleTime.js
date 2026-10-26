export function validateTimezone(zone) {
  if (typeof zone !== "string" || !zone || /^[+-]/.test(zone)) throw new Error("Invalid IANA timezone");
  try { new Intl.DateTimeFormat("en", { timeZone: zone }).format(); }
  catch { throw new Error("Invalid IANA timezone"); }
  return zone;
}

// Enumerate possible offsets and require exactly one matching wall-clock instant.
export function scheduleTime(localTime, timezone = "Asia/Kolkata", now = Date.now()) {
  validateTimezone(timezone);
  if (typeof localTime !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(localTime)) throw new Error("Use local date and time YYYY-MM-DDTHH:mm");
  const base = Date.parse(localTime + ":00Z");
  if (!Number.isFinite(base) || new Date(base).toISOString().slice(0,16) !== localTime) throw new Error("Invalid date");
  const formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const matches = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const instant = base + offset * 60000;
    if (formatter.format(instant).replace(" ", "T") === localTime) matches.push(instant);
  }
  if (matches.length !== 1) throw new Error("Local time is ambiguous or nonexistent; choose another time");
  if (matches[0] <= now) throw new Error("Publishing time must be in the future");
  return new Date(matches[0]);
}

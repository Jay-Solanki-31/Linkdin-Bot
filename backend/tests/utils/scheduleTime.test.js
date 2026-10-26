import { describe, it, expect } from "vitest";
import { scheduleTime, validateTimezone } from "../../src/utils/scheduleTime.js";
describe("strict wall-clock scheduling", () => {
  it("converts IST to UTC across a date boundary", () => {
    expect(scheduleTime("2030-01-01T01:00", "Asia/Kolkata", 0).toISOString()).toBe("2029-12-31T19:30:00.000Z");
  });
  it.each(["2030-02-30T10:00", "bad", "2030-01-01T25:00"])("rejects invalid date %s", value => expect(() => scheduleTime(value, "UTC", 0)).toThrow());
  it("rejects past dates", () => expect(() => scheduleTime("2020-01-01T10:00", "UTC")).toThrow("future"));
  it("rejects nonexistent spring-forward time", () => expect(() => scheduleTime("2030-03-10T02:30", "America/New_York", 0)).toThrow("nonexistent"));
  it("rejects ambiguous fall-back time", () => expect(() => scheduleTime("2030-11-03T01:30", "America/New_York", 0)).toThrow("ambiguous"));
  it("validates IANA timezone", () => expect(() => validateTimezone("Made/Up")).toThrow());
});

import { describe, it, expect } from "vitest";
import { initSrs, review, isDue } from "@/lib/srs";

describe("SRS review logic", () => {
  it("initial state is due now", () => {
    const s = initSrs(new Date("2025-08-24T00:00:00Z"));
    expect(isDue(s, new Date("2025-08-24T00:00:00Z"))).toBe(true);
  });

  it("Again sets short interval and resets reps", () => {
    const now = new Date("2025-08-24T00:00:00Z");
    let s = initSrs(now);
    s = review(s, 0, now);
    expect(s.reps).toBe(0);
    expect(s.intervalDays).toBeGreaterThanOrEqual(1);
    expect(isDue(s, new Date("2025-08-24T12:00:00Z"))).toBe(false);
  });

  it("Good increases reps and schedules next day then 3 days", () => {
    const base = new Date("2025-08-24T00:00:00Z");
    let s = initSrs(base);
    s = review(s, 3, base); // first success -> 1 day
    expect(s.reps).toBe(1);
    expect(s.intervalDays).toBe(1);
    const next = new Date("2025-08-25T00:00:00Z");
    s = review(s, 3, next); // second success -> 3 days
    expect(s.reps).toBe(2);
    expect(s.intervalDays).toBeGreaterThanOrEqual(3);
  });

  it("Easy bumps ease factor more than Good", () => {
    const now = new Date("2025-08-24T00:00:00Z");
    let s1 = initSrs(now);
    let s2 = initSrs(now);
    s1 = review(s1, 3, now); // Good
    s2 = review(s2, 4, now); // Easy
    expect(s2.ease).toBeGreaterThanOrEqual(s1.ease);
  });
});

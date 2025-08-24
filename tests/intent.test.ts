import { describe, it, expect } from "vitest";
import { parseIntent } from "@/lib/intent";

describe("parseIntent", () => {
  it("detects flashcards", () => {
    const p = parseIntent("generate flashcards about photosynthesis");
    expect(p.type).toBe("flashcards");
    expect(p.content.toLowerCase()).toContain("photosynthesis");
  });

  it("detects notes", () => {
    const p = parseIntent("create study notes on linked lists");
    expect(p.type).toBe("notes");
    expect(p.content.toLowerCase()).toContain("linked lists");
  });

  it("detects schedule", () => {
    const p = parseIntent("build a schedule for math monday 9:00");
    expect(p.type).toBe("schedule");
    expect(p.content.toLowerCase()).toContain("math");
  });

  it("detects fun type and kind", () => {
    const p = parseIntent("generate a quiz about gravity");
    expect(p.type).toBe("fun");
    expect(p.funKind).toBe("quiz");
  });
});

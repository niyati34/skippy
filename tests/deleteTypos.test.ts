import { describe, it, expect } from "vitest";
import { TaskUnderstanding } from "../src/lib/taskUnderstanding.ts";

describe("TaskUnderstanding - Delete intent with typos", () => {
  it("should understand 'delete all nots and flahcardd'", () => {
    const result = TaskUnderstanding.understandRequest(
      "delete all nots and flahcardd"
    );

    // expect two delete actions for notes and flashcards
    const deletes = result.actions.filter((a) => a.type === "delete");
    expect(deletes.length).toBeGreaterThanOrEqual(2);

    const hasNotes = deletes.some((a) => a.target === "notes");
    const hasFlash = deletes.some((a) => a.target === "flashcards");

    expect(hasNotes).toBe(true);
    expect(hasFlash).toBe(true);
  });

  it("should understand 'remove all cards and nots'", () => {
    const result = TaskUnderstanding.understandRequest(
      "remove all cards and nots"
    );

    const deletes = result.actions.filter((a) => a.type === "delete");
    expect(deletes.some((a) => a.target === "notes")).toBe(true);
    expect(deletes.some((a) => a.target === "flashcards")).toBe(true);
  });

  it("should understand 'remove all fladhca rd and nots' (spaced typos)", () => {
    const result = TaskUnderstanding.understandRequest(
      "remove all fladhca rd and nots"
    );

    const deletes = result.actions.filter((a) => a.type === "delete");
    expect(deletes.some((a) => a.target === "notes")).toBe(true);
    expect(deletes.some((a) => a.target === "flashcards")).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { TaskUnderstanding } from "../src/lib/taskUnderstanding.ts";

describe("TaskUnderstanding - Typo Handling", () => {
  it("should handle the exact user input with typos", () => {
    const result = TaskUnderstanding.understandRequest(
      "10 flashcarddd of react and 1 note for car"
    );

    console.log(
      '🧪 Testing input: "10 flashcarddd of react and 1 note for car"'
    );
    console.log("📊 Actions:", result.actions);

    // Should have 2 actions
    expect(result.actions).toHaveLength(2);

    // First action should be create flashcards about react with count 10
    const flashcardAction = result.actions.find(
      (a) => a.target === "flashcards"
    );
    expect(flashcardAction).toBeDefined();
    expect(flashcardAction?.type).toBe("create");
    expect(flashcardAction?.data?.topic).toBe("react");
    expect(flashcardAction?.data?.count).toBe(10);

    // Second action should be create notes about car
    const noteAction = result.actions.find((a) => a.target === "notes");
    expect(noteAction).toBeDefined();
    expect(noteAction?.type).toBe("create");
    expect(noteAction?.data?.topic).toBe("car");
  });

  it("should handle more typo variations", () => {
    const result = TaskUnderstanding.understandRequest(
      "5 flashh about js and note for html"
    );

    console.log('🧪 Testing input: "5 flashh about js and note for html"');
    console.log("📊 Actions:", result.actions);

    expect(result.actions).toHaveLength(2);

    const flashcardAction = result.actions.find(
      (a) => a.target === "flashcards"
    );
    expect(flashcardAction?.data?.count).toBe(5);
    expect(flashcardAction?.data?.topic).toBe("js");

    const noteAction = result.actions.find((a) => a.target === "notes");
    expect(noteAction?.data?.topic).toBe("html");
  });
});

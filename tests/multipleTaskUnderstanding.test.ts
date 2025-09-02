import { describe, it, expect } from "vitest";
import { TaskUnderstanding } from "../src/lib/taskUnderstanding.ts";

describe("TaskUnderstanding - Multiple Tasks", () => {
  it("should parse multiple different tasks correctly", () => {
    const result = TaskUnderstanding.understandRequest(
      "10 flashcards of react and 1 note for car"
    );

    console.log(
      '🧪 Testing input: "10 flashcards of react and 1 note for car"'
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

  it("should handle different formats of multiple tasks", () => {
    const result = TaskUnderstanding.understandRequest(
      "create 5 cards about javascript and make notes on python"
    );

    console.log(
      '🧪 Testing input: "create 5 cards about javascript and make notes on python"'
    );
    console.log("📊 Actions:", result.actions);

    expect(result.actions).toHaveLength(2);

    const flashcardAction = result.actions.find(
      (a) => a.target === "flashcards"
    );
    expect(flashcardAction?.data?.count).toBe(5);
    expect(flashcardAction?.data?.topic).toBe("javascript");

    const noteAction = result.actions.find((a) => a.target === "notes");
    expect(noteAction?.data?.topic).toBe("python");
  });

  it("should handle tasks with written numbers", () => {
    const result = TaskUnderstanding.understandRequest(
      "three flashcards about css and two notes for html"
    );

    console.log(
      '🧪 Testing input: "three flashcards about css and two notes for html"'
    );
    console.log("📊 Actions:", result.actions);

    expect(result.actions).toHaveLength(2);

    const flashcardAction = result.actions.find(
      (a) => a.target === "flashcards"
    );
    expect(flashcardAction?.data?.count).toBe(3);
    expect(flashcardAction?.data?.topic).toBe("css");

    const noteAction = result.actions.find((a) => a.target === "notes");
    expect(noteAction?.data?.topic).toBe("html");
  });
});

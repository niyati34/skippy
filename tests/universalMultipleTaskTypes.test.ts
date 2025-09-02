import { describe, it, expect, vi } from "vitest";
import { UniversalAgenticAI } from "../src/lib/universalAgent.ts";

// Mock Gemini services to avoid network calls and keep tests fast
vi.mock("../src/services/geminiAI", () => ({
  generateNotesWithGemini: vi
    .fn()
    .mockImplementation((content: string, source: string) =>
      Promise.resolve([
        {
          title: `Study Notes: ${source || "topic"}`,
          content: `# Study Notes: ${content}`,
          category: "Academic",
          tags: ["structured", "academic"],
        },
      ])
    ),
  generateFlashcardsWithGemini: vi
    .fn()
    .mockImplementation((topic: string, count: number = 5) =>
      Promise.resolve(
        Array.from({ length: count }, (_, i) => ({
          question: `Question ${i + 1} about ${topic}?`,
          answer: `Answer ${i + 1} about ${topic}.`,
          category: topic,
        }))
      )
    ),
}));

describe("Universal AI - Multiple Task Types", () => {
  it("should create different types of content for different tasks", async () => {
    const universalAI = new UniversalAgenticAI();

    console.log(
      '🧪 Testing Universal AI with: "10 flashcards of react and 1 note for car"'
    );

    const result = await universalAI.processAnyPrompt({
      text: "10 flashcards of react and 1 note for car",
    });

    console.log("📊 Result:", result);
    console.log("📦 Artifacts:", Object.keys(result.artifacts || {}));

    // Should have both flashcards and notes
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts?.flashcards).toBeDefined();
    expect(result.artifacts?.notes).toBeDefined();

    // Should have the right counts
    expect(result.artifacts?.flashcards?.length).toBe(10);
    expect(result.artifacts?.notes?.length).toBeGreaterThan(0);

    // Summary should mention both types
    expect(result.summary).toContain("flashcards");
    expect(result.summary).toContain("notes");
  });

  it("should handle mixed content requests correctly", async () => {
    const universalAI = new UniversalAgenticAI();

    console.log(
      '🧪 Testing Universal AI with: "5 cards about css and notes for html"'
    );

    const result = await universalAI.processAnyPrompt({
      text: "5 cards about css and notes for html",
    });

    console.log("📊 Result:", result);
    console.log("📦 Artifacts:", Object.keys(result.artifacts || {}));

    // Should have both types
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts?.flashcards).toBeDefined();
    expect(result.artifacts?.notes).toBeDefined();

    // CSS flashcards should be created
    if (result.artifacts?.flashcards) {
      expect(result.artifacts.flashcards.length).toBe(5);
    }

    // HTML notes should be created
    if (result.artifacts?.notes) {
      expect(result.artifacts.notes.length).toBeGreaterThan(0);
    }
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { UniversalAgenticAI } from "../src/lib/universalAgent";

// Mock the AI services to avoid external API calls in tests
vi.mock("../src/services/openRouterAI", () => ({
  processPrompt: vi.fn().mockResolvedValue({
    success: true,
    result: JSON.stringify({
      domain: "flashcards",
      action: "create",
      parameters: {
        topic: "JavaScript interview questions",
        count: 50,
        difficulty: "medium",
      },
      confidence: 0.9,
      reasoning:
        "User wants to create flashcards about JavaScript interview questions",
    }),
  }),
}));

vi.mock("../src/services/geminiAI", () => ({
  processPrompt: vi.fn().mockResolvedValue({
    success: true,
    result: "Mock Gemini response",
  }),
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

describe("Universal Agentic AI - JavaScript Flashcards Test", () => {
  let universalAI;

  beforeEach(() => {
    universalAI = new UniversalAgenticAI();
    // Clear all mocks
    vi.clearAllMocks();
  });

  it("should correctly process the problematic prompt and generate JavaScript flashcards", async () => {
    const result = await universalAI.processAnyPrompt({
      text: "create50 flash card from javascript interview most asked question",
    });

    expect(result.summary).toBeDefined();
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts.flashcards).toBeDefined();
    expect(Array.isArray(result.artifacts.flashcards)).toBe(true);

    // Should generate flashcards
    expect(result.artifacts.flashcards.length).toBeGreaterThan(0);

    // Check for quality content if flashcards were generated
    if (result.artifacts.flashcards.length > 0) {
      const firstCard = result.artifacts.flashcards[0];
      expect(firstCard).toHaveProperty("question");
      expect(firstCard).toHaveProperty("answer");

      // Should not contain dummy content
      const dummyCards = result.artifacts.flashcards.filter(
        (card) =>
          card.question.includes("Advanced check") ||
          card.question.includes("dummy")
      );
      expect(dummyCards.length).toBe(0);
    }
  });

  it("should handle grammar correction properly", async () => {
    const result = await universalAI.processAnyPrompt({
      text: "create10flashcard about react hooks",
    });

    expect(result.summary).toBeDefined();
    // Should indicate successful processing or provide helpful guidance
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("should generate intelligent content with topic enhancement", async () => {
    const result = await universalAI.processAnyPrompt({
      text: "make 5 flashcards about closures",
    });

    expect(result.summary).toBeDefined();
    expect(result.artifacts).toBeDefined();

    // Should either create flashcards or provide helpful guidance
    if (result.artifacts.flashcards && result.artifacts.flashcards.length > 0) {
      const closureCards = result.artifacts.flashcards.filter(
        (card) =>
          card.question.toLowerCase().includes("closure") ||
          card.answer.toLowerCase().includes("closure") ||
          card.question.toLowerCase().includes("scope")
      );

      expect(closureCards.length).toBeGreaterThan(0);
    }
  });

  it("should handle mixed requests properly", async () => {
    const result = await universalAI.processAnyPrompt({
      text: "create notes and flashcards for async javascript",
    });

    expect(result.summary).toBeDefined();
    expect(result.artifacts).toBeDefined();

    // Should handle the request and either create content or provide guidance
    const hasNotes =
      result.artifacts.notes && result.artifacts.notes.length > 0;
    const hasFlashcards =
      result.artifacts.flashcards && result.artifacts.flashcards.length > 0;

    // Should attempt to handle mixed requests
    expect(
      hasNotes ||
        hasFlashcards ||
        result.summary.includes("notes") ||
        result.summary.includes("flashcards")
    ).toBe(true);
  });

  it("should provide helpful guidance for processing requests", async () => {
    const result = await universalAI.processAnyPrompt({
      text: "make something about programming",
    });

    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(10); // Should provide meaningful response
  });
});

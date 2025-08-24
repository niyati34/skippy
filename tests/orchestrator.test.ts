import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  Orchestrator,
  NotesAgent,
  PlannerAgent,
  FlashcardAgent,
  FunAgent,
  BuddyAgent,
} from "@/lib/agent";

// Mock services used by agents
vi.mock("@/services/openrouter", () => ({
  callOpenRouter: vi.fn(async () => "ok"),
  generateNotesFromContent: vi.fn(async (text: string) => [
    { title: "T", content: "C", category: "General", tags: [] },
  ]),
  generateScheduleFromContent: vi.fn(async (text: string) => [
    { id: "1", title: "Event", date: "2025-01-01", time: "09:00" },
  ]),
  generateFlashcards: vi.fn(async (text: string) => [
    { question: "Q", answer: "A", category: "General" },
  ]),
  generateFunLearning: vi.fn(
    async (text: string, kind: string) => `${kind}:${text.slice(0, 10)}`
  ),
}));

describe("Orchestrator routing", () => {
  const orch = new Orchestrator([
    new NotesAgent(),
    new PlannerAgent(),
    new FlashcardAgent(),
    new FunAgent(),
    new BuddyAgent(),
  ]);

  it("routes to NotesAgent and returns notes artifact", async () => {
    const res = await orch.handle({ text: "generate notes on arrays" });
    expect(res.artifacts?.notes?.length).toBe(1);
    expect(res.summary.toLowerCase()).toContain("notes");
  });

  it("routes to PlannerAgent and returns schedule artifact", async () => {
    const res = await orch.handle({ text: "build a schedule for math" });
    expect(res.artifacts?.schedule?.length).toBe(1);
    expect(res.summary.toLowerCase()).toContain("schedule");
  });

  it("routes to FlashcardAgent and returns cards artifact", async () => {
    const res = await orch.handle({ text: "create flashcards about trees" });
    expect(res.artifacts?.flashcards?.length).toBe(1);
    expect(res.summary.toLowerCase()).toContain("flashcard");
  });

  it("routes to FunAgent and returns fun artifact", async () => {
    const res = await orch.handle({ text: "generate a story about gravity" });
    expect(res.artifacts?.fun?.content).toContain("story:");
  });
});

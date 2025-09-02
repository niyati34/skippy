import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDefaultOrchestrator } from "@/lib/agent";

// Minimal localStorage mock for jsdom
class MemoryStorage {
  store: Record<string, string> = {};
  getItem(k: string) {
    return this.store[k] ?? null;
  }
  setItem(k: string, v: string) {
    this.store[k] = String(v);
  }
  removeItem(k: string) {
    delete this.store[k];
  }
  clear() {
    this.store = {};
  }
}

// Mock services with deterministic outputs
vi.mock("@/services/openrouter", async () => {
  const mod = await vi.importActual<any>("@/services/openrouter");
  return {
    ...mod,
    callOpenRouter: vi.fn().mockResolvedValue("ok"),
    generateNotesFromContent: vi.fn(async (content: string, file: string) => [
      {
        title: `Notes from ${file}`,
        content: `Notes: ${content.slice(0, 20)}`,
        category: "General",
        tags: ["test"],
      },
    ]),
    generateFlashcards: vi.fn(async (_content: string) => [
      { question: "Q1", answer: "A1", category: "Gen" },
      { question: "Q2", answer: "A2", category: "Gen" },
    ]),
    generateScheduleFromContent: vi.fn(async (_content: string) => [
      {
        title: "Task",
        date: "2025-01-01",
        time: "09:00",
        type: "assignment",
        priority: "high",
      },
    ]),
  };
});

describe("Orchestrator", () => {
  beforeEach(() => {
    (global as any).localStorage = new MemoryStorage();
  });

  it("creates notes when asked", async () => {
    const orch = createDefaultOrchestrator();
    const res = await orch.handle({ text: "make notes about biology" });
    expect(res.summary.toLowerCase()).toContain("created");
    const notes = JSON.parse(localStorage.getItem("skippy-notes") || "[]");
    expect(notes.length).toBeGreaterThan(0);
  });

  it("creates flashcards when asked", async () => {
    const orch = createDefaultOrchestrator();
    const res = await orch.handle({ text: "generate flashcards on math" });
    expect(res.summary.toLowerCase()).toContain("created");
    const cards = JSON.parse(localStorage.getItem("skippy-flashcards") || "[]");
    expect(cards.length).toBe(5); // Default count is 5
  });

  it("adds schedule items when asked", async () => {
    const orch = createDefaultOrchestrator();
    const res = await orch.handle({ text: "build a schedule for next week" });
    expect(res.summary.toLowerCase()).toContain("added");
    const items = JSON.parse(localStorage.getItem("skippy-schedule") || "[]");
    expect(items.length).toBe(1);
  });

  it("runs multiple tools if request mentions multiple artifacts", async () => {
    const orch = createDefaultOrchestrator();
    const res = await orch.handle({
      text: "make notes and flashcards for physics",
    });
    expect(res.artifacts?.notes).toBeTruthy();
    expect(res.artifacts?.flashcards).toBeTruthy();
  });
});

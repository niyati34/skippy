// Minimal agent skeleton for multi-agent orchestration wired to real tools
import { parseIntent } from "@/lib/intent";
import {
  callOpenRouter,
  generateNotesFromContent,
  generateScheduleFromContent,
  generateFlashcards,
  generateFunLearning,
  ChatMessage,
} from "@/services/openrouter";

export type AgentMessage = { role: "system" | "user" | "assistant"; content: string };

export interface AgentTaskInput {
  intent?: string; // optional hint
  text?: string; // user freeform text
  files?: Array<{ name: string; type: string; content: string }>;
}

export interface AgentResult {
  summary: string;
  // Artifacts follow a stable shape so UI can apply updates
  artifacts?: {
    notes?: any[];
    flashcards?: any[];
    schedule?: any[];
    fun?: { type: string; content: string };
  };
}

export interface Agent {
  name: string;
  canHandle(input: AgentTaskInput): boolean;
  run(input: AgentTaskInput): Promise<AgentResult>;
}

export class BuddyAgent implements Agent {
  name = "Buddy";
  canHandle() {
    return true; // final fallback
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const prompt = (input.text || "").trim();
    if (!prompt) return { summary: "How can I help with your studies today?" };
    // Keep Buddy concise to avoid duplicating general chat elsewhere
    const system: ChatMessage = {
      role: "system",
      content:
        "You are Skippy, an AI study buddy. Reply in plain text only (no markdown). Be concise (2-4 short sentences).",
    };
    const reply = await callOpenRouter([system, { role: "user", content: prompt }]);
    return { summary: reply || "" };
  }
}

export class NotesAgent implements Agent {
  name = "Notes";
  canHandle(i: AgentTaskInput) {
    const s = (i.intent || i.text || "").toLowerCase();
    return /\bnotes?\b|summar|study/.test(s);
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const raw = input.text || "";
    const notes = await generateNotesFromContent(raw, "chat-input");
    return {
      summary: `Created ${Array.isArray(notes) ? notes.length : 0} structured notes from your prompt.`,
      artifacts: { notes },
    };
  }
}

export class PlannerAgent implements Agent {
  name = "Planner";
  canHandle(i: AgentTaskInput) {
    const s = (i.intent || i.text || "").toLowerCase();
    return /plan|schedule|timetable|calendar|exam|assignment/.test(s);
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const raw = input.text || "";
    const schedule = await generateScheduleFromContent(raw);
    return {
      summary: `Added ${Array.isArray(schedule) ? schedule.length : 0} schedule items from your prompt.`,
      artifacts: { schedule },
    };
  }
}

export class FlashcardAgent implements Agent {
  name = "Flashcard";
  canHandle(i: AgentTaskInput) {
    const s = (i.intent || i.text || "").toLowerCase();
    return /flashcard|practice|quiz|revise|cards?/.test(s);
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const raw = input.text || "";
    const cards = await generateFlashcards(raw);
    return {
      summary: `Created ${Array.isArray(cards) ? cards.length : 0} flashcards from your prompt.`,
      artifacts: { flashcards: cards },
    };
  }
}

export class FunAgent implements Agent {
  name = "Fun";
  canHandle(i: AgentTaskInput) {
    const s = (i.intent || i.text || "").toLowerCase();
    return /(story|quiz|poem|song|rap|riddle|game)/.test(s);
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const { type, content, funKind } = parseIntent(input.text || "");
    const kind = funKind || "story";
    const out = await generateFunLearning(content || input.text || "", kind);
    return { summary: `Generated a ${kind} for you.`, artifacts: { fun: { type: kind, content: out } } };
  }
}

export class Orchestrator {
  constructor(private agents: Agent[]) {}
  async handle(input: AgentTaskInput): Promise<AgentResult> {
    const parsed = parseIntent(input.text || "");
    const enriched: AgentTaskInput = { ...input, intent: parsed.type };
    const agent = this.agents.find((ag) => ag.canHandle(enriched)) || this.agents[0];
    return agent.run(enriched);
  }
}

// Minimal agent skeleton for multi-agent orchestration wired to real tools
import { parseIntent } from "@/lib/intent";
import { BuddyMemoryStorage } from "@/lib/storage";
import {
  callOpenRouter,
  generateNotesFromContent,
  generateScheduleFromContent,
  generateFlashcards,
  generateFunLearning,
  ChatMessage,
} from "@/services/openrouter";

export type AgentMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

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
    // Update lightweight memory: topics + preferences
    const lower = prompt.toLowerCase();
    const inferredTopics = [
      "math",
      "physics",
      "chemistry",
      "biology",
      "history",
      "geography",
      "english",
      "programming",
      "algorithms",
      "data structures",
      "statistics",
      "calculus",
      "algebra",
    ].filter((t) => lower.includes(t));

    // Parse simple preferences from free text
    const nameMatch = prompt.match(
      /(?:i am|i'm|call me|my name is)\s+([a-zA-Z][\w\-]+)/i
    );
    const tone: "friendly" | "formal" | undefined = /formal/i.test(prompt)
      ? "formal"
      : /friendly|casual|chill/i.test(prompt)
      ? "friendly"
      : undefined;
    const studyTimes: string[] = [
      /morning/i.test(prompt) ? "morning" : "",
      /afternoon/i.test(prompt) ? "afternoon" : "",
      /evening/i.test(prompt) ? "evening" : "",
      /night/i.test(prompt) ? "night" : "",
    ].filter(Boolean) as string[];

    const mem = BuddyMemoryStorage.update({
      topics: inferredTopics,
      messageCount: 1,
      name: nameMatch ? nameMatch[1] : undefined,
      tone,
      preferences: studyTimes.length
        ? { ...(BuddyMemoryStorage.load().preferences || {}), studyTimes }
        : BuddyMemoryStorage.load().preferences,
    });

    // Keep Buddy concise and personalized
    const system: ChatMessage = {
      role: "system",
      content: `You are Skippy, an AI study buddy. Reply in plain text only (no markdown). Be concise (2-4 short sentences). Use a ${
        mem.tone || "friendly"
      } tone. If user name is known, greet them once in first sentence using ${
        mem.name || "friend"
      }. Avoid repeating their name every message. If relevant, you may reference remembered topics: ${(
        mem.topics || []
      )
        .slice(0, 5)
        .join(
          ", "
        )}. If study time preferences are known, propose schedules aligned to: ${
        mem.preferences?.studyTimes?.join(", ") || ""
      }.`,
    };
    const reply = await callOpenRouter(
      [system, { role: "user", content: prompt }],
      {
        model: (window as any)?.pickModel
          ? (window as any).pickModel("chat", prompt)
          : undefined,
      }
    );
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
      summary: `Created ${
        Array.isArray(notes) ? notes.length : 0
      } structured notes from your prompt.`,
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
      summary: `Added ${
        Array.isArray(schedule) ? schedule.length : 0
      } schedule items from your prompt.`,
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
      summary: `Created ${
        Array.isArray(cards) ? cards.length : 0
      } flashcards from your prompt.`,
      artifacts: { flashcards: cards },
    };
  }
}

export class FunAgent implements Agent {
  name = "Fun";
  canHandle(i: AgentTaskInput) {
    const parsed = parseIntent(i.text || "");
    return parsed.type === "fun";
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const { type, content, funKind } = parseIntent(input.text || "");
    const kind = funKind || "story";
    const out = await generateFunLearning(content || input.text || "", kind);
    return {
      summary: `Generated a ${kind} for you.`,
      artifacts: { fun: { type: kind, content: out } },
    };
  }
}

export class Orchestrator {
  constructor(private agents: Agent[]) {}
  async handle(input: AgentTaskInput): Promise<AgentResult> {
    const parsed = parseIntent(input.text || "");
    const enriched: AgentTaskInput = { ...input, intent: parsed.type };
    const agent =
      this.agents.find((ag) => ag.canHandle(enriched)) || this.agents[0];
    return agent.run(enriched);
  }
}

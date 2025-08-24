// Advanced multi-agent orchestrator with memory and tool use
import { parseIntent } from "@/lib/intent";
import {
  generateFlashcards,
  generateNotesFromContent,
  generateScheduleFromContent,
  generateFunLearning,
  type ChatMessage,
  callOpenRouter,
} from "@/services/openrouter";
import {
  BuddyMemoryStorage,
  FlashcardStorage,
  NotesStorage,
  ScheduleStorage,
  type StoredFlashcard,
  type StoredNote,
  type StoredScheduleItem,
} from "@/lib/storage";

export type AgentMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface AgentTaskInput {
  intent?: string;
  text?: string;
  files?: Array<{ name: string; type: string; content: string }>;
}

export interface AgentResult {
  summary: string;
  artifacts?: Record<string, any>;
}

export interface Agent {
  name: string;
  canHandle(input: AgentTaskInput): boolean;
  run(input: AgentTaskInput): Promise<AgentResult>;
}

function plain(text: string): string {
  if (!text) return "";
  return text
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .slice(0, 4)
    .join(" ");
}

function extractTopics(text?: string): string[] {
  if (!text) return [];
  const words = (text.toLowerCase().match(/[a-z]{5,}/g) || []).slice(0, 12);
  // de-dupe and keep first N
  return Array.from(new Set(words)).slice(0, 8);
}

export class BuddyAgent implements Agent {
  name = "Buddy";
  canHandle() {
    return true; // default router for small talk and general commands
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const mem = BuddyMemoryStorage.load();
    const name = mem.name ? ` for ${mem.name}` : "";
    // learn topics from this message
    const learned = extractTopics(input.text);
    if (learned.length) BuddyMemoryStorage.addTopics(learned);

    // Try a concise AI reply when text exists
    if (input.text && input.text.trim().length > 0) {
      const toneLine =
        mem.tone === "formal"
          ? "Use a respectful tone."
          : "Use a friendly tone.";
      const sys: ChatMessage = {
        role: "system",
        content: `You are Skippy, an AI study buddy${name}. Be concise and plain text only. No emojis, no markdown. 2–4 short sentences. Ask at most one clarifying question. ${toneLine}`,
      };
      try {
        const out = await callOpenRouter([
          sys,
          { role: "user", content: input.text.substring(0, 4000) },
        ]);
        const msg = plain(out);
        BuddyMemoryStorage.logTask("chat", msg.substring(0, 120));
        return { summary: msg };
      } catch {
        // fall through to static reply
      }
    }

    BuddyMemoryStorage.logTask("chat", "Short reply");
    return {
      summary:
        "I'm here and ready to help. Ask me to make notes, flashcards, or a schedule.",
    };
  }
}

export class NotesAgent implements Agent {
  name = "Notes";
  canHandle(i: AgentTaskInput) {
    return /note|summar|study/i.test(i.intent || i.text || "");
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const source = input.files?.[0]?.name || "chat-input";
    const text =
      input.text || input.files?.map((f) => f.content).join("\n\n") || "";
    const notes = await generateNotesFromContent(text, source);
    const saved = NotesStorage.addBatch(
      (notes || []).map((n) => ({
        title: n.title || `Notes from ${source}`,
        content: n.content || "",
        source,
        category: n.category || "General",
        tags: Array.isArray(n.tags) ? n.tags : ["study"],
      }))
    );
    BuddyMemoryStorage.logTask("notes", `Added ${saved.length} notes`);
    return {
      summary: saved.length
        ? `Created ${saved.length} structured notes from your content.`
        : "I couldn't create notes from this. Please provide more content.",
      artifacts: { notes: saved },
    };
  }
}

export class PlannerAgent implements Agent {
  name = "Planner";
  canHandle(i: AgentTaskInput) {
    return /plan|schedule|timetable|exam|assignment|calendar/i.test(
      i.intent || i.text || ""
    );
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const source = input.files?.[0]?.name || "chat-input";
    const text =
      input.text || input.files?.map((f) => f.content).join("\n\n") || "";
    const items = await generateScheduleFromContent(text);
    const saved = ScheduleStorage.addBatch(
      (items || []).map((it) => ({
        title: it.title || "Event",
        date: it.date,
        time: it.time || "09:00",
        type: (it.type as StoredScheduleItem["type"]) || "assignment",
        source,
      }))
    );
    BuddyMemoryStorage.logTask("schedule", `Added ${saved.length} items`);
    return {
      summary: saved.length
        ? `Added ${saved.length} items to your schedule.`
        : "I didn’t find clear dates or times. Add specific dates/times or upload a schedule file.",
      artifacts: { schedule: saved },
    };
  }
}

export class FlashcardAgent implements Agent {
  name = "Flashcard";
  canHandle(i: AgentTaskInput) {
    return /flashcard|practice|quiz|revise/i.test(i.intent || i.text || "");
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const source = input.files?.[0]?.name || "chat-input";
    const text =
      input.text || input.files?.map((f) => f.content).join("\n\n") || "";
    const cards = await generateFlashcards(text);
    const mapped = (cards || []).map((c: any) => ({
      question: c.question || c.front || "Question",
      answer: c.answer || c.back || "Answer",
      category: c.category || "General",
    }));
    const saved = FlashcardStorage.addBatch(
      mapped as Omit<StoredFlashcard, "id" | "createdAt">[]
    );
    BuddyMemoryStorage.logTask("flashcards", `Added ${saved.length} cards`);
    return {
      summary: saved.length
        ? `Created ${saved.length} flashcards from your content.`
        : "I couldn’t extract enough content to make flashcards. Try adding more detail or paste text.",
      artifacts: { flashcards: saved },
    };
  }
}

export class FunAgent implements Agent {
  name = "Fun";
  canHandle(i: AgentTaskInput) {
    return /(story|quiz|poem|song|rap|riddle|game)/i.test(
      i.intent || i.text || ""
    );
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const text =
      input.text || input.files?.map((f) => f.content).join("\n\n") || "";
    const match =
      (text.match(/(story|quiz|poem|song|rap|riddle|game)/i) || [])[1] ||
      "story";
    const out = await generateFunLearning(text, match.toLowerCase());
    BuddyMemoryStorage.logTask("fun", `Created ${match}`);
    return {
      summary: `Created a ${match}. See the Fun Learning section to view it.`,
      artifacts: { fun: { type: match.toLowerCase(), content: out } },
    };
  }
}

export class Orchestrator {
  constructor(private agents: Agent[]) {}

  // High-level router with simple multi-tool support
  async handle(input: AgentTaskInput): Promise<AgentResult> {
    const text = (input.text || "").trim();
    const parsed = parseIntent(text);
    const wantsFlash = parsed.type === "flashcards" || /flashcards?/.test(text);
    const wantsNotes = parsed.type === "notes" || /notes?/.test(text);
    const wantsSchedule =
      parsed.type === "schedule" || /(schedule|calendar|timetable)/.test(text);
    const wantsFun =
      parsed.type === "fun" ||
      /(story|quiz|poem|song|rap|riddle|game)/i.test(text);

    // Multi-action: run selected tools in sequence and aggregate summaries
    const results: AgentResult[] = [];
    if (wantsNotes)
      results.push(await new NotesAgent().run({ ...input, intent: "notes" }));
    if (wantsFlash)
      results.push(
        await new FlashcardAgent().run({ ...input, intent: "flashcards" })
      );
    if (wantsSchedule)
      results.push(
        await new PlannerAgent().run({ ...input, intent: "schedule" })
      );
    if (wantsFun)
      results.push(await new FunAgent().run({ ...input, intent: "fun" }));

    if (results.length) {
      return {
        summary: results.map((r) => r.summary).join(" "),
        artifacts: Object.assign({}, ...results.map((r) => r.artifacts || {})),
      };
    }

    // Otherwise pick best matching agent or default Buddy
    const a =
      this.agents.find((ag) =>
        ag.canHandle({ ...input, intent: parsed.type })
      ) || new BuddyAgent();
    return a.run({ ...input, intent: parsed.type });
  }
}

// Default orchestrator factory
export function createDefaultOrchestrator() {
  return new Orchestrator([
    new NotesAgent(),
    new PlannerAgent(),
    new FlashcardAgent(),
    new FunAgent(),
    new BuddyAgent(),
  ]);
}

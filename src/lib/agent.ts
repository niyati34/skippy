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
  TimetableStorage,
  type StoredFlashcard,
  type StoredNote,
  type StoredScheduleItem,
} from "@/lib/storage";
import { parseScheduleCommand } from "@/utils/nlpSchedule";
import {
  parseTimetableFast,
  parseTC4Schedule,
  type ParsedTimetableClass,
} from "@/lib/timetableParser";

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
    timetable?: any[];
  };
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

// Lightweight schedule Q&A helpers
function _norm(s: string) {
  return (s || "").toLowerCase();
}

function _fmtDate(d: string) {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function quickScheduleAnswer(q: string): AgentResult | null {
  const s = _norm(q);
  if (!s) return null;

  console.log("🔍 [Schedule Q&A] Checking question:", q);

  // Try to infer date from NL parser (today/tomorrow/weekday or explicit)
  let date: string | undefined;
  try {
    const parsed = parseScheduleCommand(q);
    if (parsed.length) date = parsed[0].date;
    console.log("📅 [Schedule Q&A] Parsed date:", date);
  } catch {}

  const typeMatch = s.match(/\b(exam|class|assignment|event)\b/);
  const wantType = typeMatch?.[1];
  const kwMatch = s.match(/\b(?:for|about|on)\s+([^?.,;]+)/i);
  const kw = kwMatch ? _norm(kwMatch[1]) : undefined;

  const all = ScheduleStorage.load();
  console.log("📋 [Schedule Q&A] Total schedule items:", all.length);
  let items = all;
  if (date) items = items.filter((it) => it.date === date);
  if (wantType === "exam") items = items.filter((it) => it.type === "exam");
  if (kw) items = items.filter((it) => _norm(it.title).includes(kw));
  console.log("🎯 [Schedule Q&A] Filtered items:", items.length);

  if (/\bdo\s+i\s+have\b/i.test(s) || /\bwhat\s+do\s+i\s+have\b/i.test(s)) {
    if (date) {
      if (!items.length) {
        console.log("✅ [Schedule Q&A] No items found for date");
        return { summary: `You have nothing scheduled on ${_fmtDate(date)}.` };
      }
      const list = items
        .map((it) => `${it.type === "exam" ? "Exam" : it.title} at ${it.time}`)
        .join("; ");
      console.log("✅ [Schedule Q&A] Found items for date");
      return { summary: `On ${_fmtDate(date)}: ${list}.` };
    }
    const upcoming = [...all].sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    )[0];
    if (upcoming) {
      console.log("✅ [Schedule Q&A] Found upcoming item");
      return {
        summary: `Your next item is ${upcoming.title} (${
          upcoming.type
        }) on ${_fmtDate(upcoming.date)} at ${upcoming.time}.`,
      };
    } else {
      console.log("✅ [Schedule Q&A] No schedule items found");
      return { summary: "I couldn't find any schedule items yet." };
    }
  }

  if (/\bwhen\s+is\b/i.test(s)) {
    if (!items.length) {
      console.log("✅ [Schedule Q&A] No matching items for 'when is'");
      return { summary: "I couldn't find a matching schedule item." };
    }
    const hit = items[0];
    console.log("✅ [Schedule Q&A] Found item for 'when is'");
    return {
      summary: `${hit.title} is on ${_fmtDate(hit.date)} at ${hit.time}.`,
    };
  }

  console.log("❌ [Schedule Q&A] No pattern matched");
  return null;
}

// Enhanced Buddy Agent with personality and mood awareness
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

    // Enhanced personality-based responses
    const personality =
      mem.tone === "formal"
        ? "respectful and professional"
        : "friendly and encouraging";

    // First try quick schedule Q&A (no LLM call)
    if (input.text) {
      const qa = quickScheduleAnswer(input.text);
      if (qa) {
        BuddyMemoryStorage.logTask("chat", "Schedule QA");
        return qa;
      }
    }

    // Try a concise AI reply when text exists
    if (input.text && input.text.trim().length > 0) {
      const sys: ChatMessage = {
        role: "system",
        content: `You are Skippy, an AI study buddy${name}. Be ${personality}. Be concise and plain text only. No emojis, no markdown. 2–4 short sentences. Ask at most one clarifying question. Remember the student's preferences and past interactions.

Recent schedule context (max 5): ${
          ScheduleStorage.load()
            .slice(0, 5)
            .map((it) => `${it.title} (${it.type}) on ${it.date} at ${it.time}`)
            .join(" | ") || "none"
        }`,
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
        "I'm here and ready to help! Ask me to make notes, flashcards, or a schedule. I can also remember your preferences and help you study smarter.",
    };
  }
}

// Enhanced Notes Agent with better content processing
export class NotesAgent implements Agent {
  name = "Notes";
  canHandle(i: AgentTaskInput) {
    return /note|summar|study|extract/i.test(i.intent || i.text || "");
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const source = input.files?.[0]?.name || "chat-input";
    const text =
      input.text || input.files?.map((f) => f.content).join("\n\n") || "";

    try {
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
          ? `Created ${saved.length} structured notes from your content. They're now saved and ready for review!`
          : "I couldn't create notes from this. Please provide more content or try a different file.",
        artifacts: { notes: saved },
      };
    } catch (error) {
      console.error("Notes generation failed:", error);
      return {
        summary:
          "I had trouble creating notes. Let me try a different approach or you can try uploading the content again.",
      };
    }
  }
}

// Enhanced Planner Agent with fast timetable parsing
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

    // 0) Try lightweight natural-language parsing to avoid "no dates" response
    try {
      const parsed = parseScheduleCommand(text);
      if (parsed.length) {
        const saved = ScheduleStorage.addBatch(
          parsed.map((it) => ({
            title: it.title || "Event",
            date: it.date,
            time: it.time || "09:00",
            type: it.type,
            source,
          }))
        );
        BuddyMemoryStorage.logTask(
          "schedule",
          `Added ${saved.length} items via NL parser`
        );
        return {
          summary: `Added ${saved.length} item(s) to your schedule.`,
          artifacts: { schedule: saved },
        };
      }
    } catch (e) {
      console.warn("NL schedule parse failed:", e);
    }

    // First try fast timetable parsing
    try {
      console.log("🚀 [PLANNER] Attempting fast timetable parsing...");

      // Check if it's a TC4 schedule format
      if (text.includes("–") && /\d{2}:\d{2}-\d{2}:\d{2}/.test(text)) {
        const tc4Classes = parseTC4Schedule(text);
        if (tc4Classes.length > 0) {
          // Add to timetable storage
          TimetableStorage.addClasses(tc4Classes);

          // Also add to schedule storage for compatibility
          const scheduleItems = tc4Classes.map((cls) => ({
            title: cls.title,
            date: new Date().toISOString().split("T")[0], // Today's date
            time: cls.time,
            type: "assignment" as const,
            source: cls.source,
          }));
          ScheduleStorage.addBatch(scheduleItems);

          BuddyMemoryStorage.logTask(
            "schedule",
            `Added ${tc4Classes.length} TC4 classes`
          );
          return {
            summary: `Successfully parsed ${tc4Classes.length} classes from your TC4 schedule! They're now in your timetable and ready to view.`,
            artifacts: { timetable: tc4Classes, schedule: scheduleItems },
          };
        }
      }

      // Try general fast parsing
      const fastResult = parseTimetableFast(text, source);
      if (fastResult.classes.length > 0) {
        // Add to timetable storage
        TimetableStorage.addClasses(fastResult.classes);

        // Also add to schedule storage for compatibility
        const scheduleItems = fastResult.classes.map((cls) => ({
          title: cls.title,
          date: new Date().toISOString().split("T")[0],
          time: cls.time,
          type: "assignment" as const,
          source: cls.source,
        }));
        ScheduleStorage.addBatch(scheduleItems);

        BuddyMemoryStorage.logTask(
          "schedule",
          `Added ${fastResult.classes.length} classes via fast parser`
        );
        return {
          summary: `Quickly extracted ${
            fastResult.classes.length
          } classes from your schedule with ${Math.round(
            fastResult.confidence * 100
          )}% confidence! They're now in your timetable.`,
          artifacts: { timetable: fastResult.classes, schedule: scheduleItems },
        };
      }
    } catch (error) {
      console.warn("Fast parsing failed, falling back to AI:", error);
    }

    // Fallback to AI-based parsing
    try {
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
      BuddyMemoryStorage.logTask(
        "schedule",
        `Added ${saved.length} items via AI`
      );
      return {
        summary: saved.length
          ? `Added ${saved.length} items to your schedule using AI analysis.`
          : "I didn't find clear dates or times. Add specific dates/times or upload a schedule file.",
        artifacts: { schedule: saved },
      };
    } catch (error) {
      console.error("AI schedule generation failed:", error);
      return {
        summary:
          "I had trouble processing your schedule. Please make sure it contains clear dates and times, or try uploading a different format.",
      };
    }
  }
}

// Enhanced Flashcard Agent with better content processing
export class FlashcardAgent implements Agent {
  name = "Flashcard";
  canHandle(i: AgentTaskInput) {
    return /flashcard|practice|quiz|revise|test/i.test(
      i.intent || i.text || ""
    );
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const source = input.files?.[0]?.name || "chat-input";
    const text =
      input.text || input.files?.map((f) => f.content).join("\n\n") || "";

    console.log("📚 [FlashcardAgent] Input text:", text);

    // If text is too short, try to expand it with basic topic context
    let content = text;
    if (content.length < 20 && content.trim()) {
      // Enhance short topics like "AI" with some context
      const topic = content.trim();
      content = `Please create flashcards about ${topic}. Include key concepts, definitions, and important information about ${topic}.`;
      console.log("✨ [FlashcardAgent] Enhanced content:", content);
    }

    try {
      console.log(
        "🔄 [FlashcardAgent] Calling generateFlashcards with content length:",
        content.length
      );
      const cards = await generateFlashcards(content);
      console.log("📋 [FlashcardAgent] Generated cards:", cards?.length || 0);
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
          ? `Created ${saved.length} flashcards from your content. They're ready for practice!`
          : "I couldn't extract enough content to make flashcards. Try adding more detail or paste text.",
        artifacts: { flashcards: saved },
      };
    } catch (error) {
      console.error("🚨 [FlashcardAgent] Generation failed:", error);
      return {
        summary:
          "I had trouble creating flashcards. Please provide more detailed content or try a different approach.",
      };
    }
  }
}

// Enhanced Fun Agent with better content generation
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

    try {
      const out = await generateFunLearning(text, match.toLowerCase());
      BuddyMemoryStorage.logTask("fun", `Created ${match}`);
      return {
        summary: `Created a fun ${match} for you! Check the Fun Learning section to enjoy it.`,
        artifacts: { fun: { type: match.toLowerCase(), content: out } },
      };
    } catch (error) {
      console.error("Fun content generation failed:", error);
      return {
        summary:
          "I had trouble creating that fun content. Let me try something else or you can ask for a different type of learning activity.",
      };
    }
  }
}

// New Command Agent for advanced natural language processing
export class CommandAgent implements Agent {
  name = "Command";
  canHandle(i: AgentTaskInput) {
    // Handle complex multi-step commands including CRUD operations
    return /(make|create|generate|do|help|remember|remind|delete|remove|clear|reschedule|move|update)/i.test(
      i.intent || i.text || ""
    );
  }

  async run(input: AgentTaskInput): Promise<AgentResult> {
    const text = input.text || "";
    const mem = BuddyMemoryStorage.load();

    // Enhanced command parsing
    const commands = this.parseCommands(text);

    if (commands.length === 0) {
      return {
        summary:
          "I'm not sure what you'd like me to do. Try saying something like 'make flashcards from this' or 'create a schedule'.",
      };
    }

    // Execute commands in sequence
    const results: string[] = [];
    const artifacts: Record<string, any> = {};

    for (const command of commands) {
      try {
        const result = await this.executeCommand(command, input);
        results.push(result.summary);
        if (result.artifacts) {
          Object.assign(artifacts, result.artifacts);
        }
      } catch (error) {
        console.error(`Command execution failed:`, error);
        results.push(`I couldn't complete: ${command.action}`);
      }
    }

    BuddyMemoryStorage.logTask(
      "command",
      `Executed ${commands.length} commands`
    );

    return {
      summary: results.join(" "),
      artifacts,
    };
  }

  private parseCommands(
    text: string
  ): Array<{ action: string; target: string; params: any }> {
    const commands: Array<{ action: string; target: string; params: any }> = [];

    // Multi-step command patterns
    const patterns = [
      // Handle compound commands like "make notes and flashcards for X"
      {
        regex:
          /(make|create|generate)\s+notes?\s+and\s+flashcards?\s+(?:from|about|on|for)\s+(.+)/i,
        action: "create_both",
        target: "content",
      },
      {
        regex:
          /(make|create|generate)\s+flashcards?\s+and\s+notes?\s+(?:from|about|on|for)\s+(.+)/i,
        action: "create_both",
        target: "content",
      },
      {
        regex:
          /(make|create|generate)\s+(flashcards?)\s+(?:from|about|on|for)\s+(.+)/i,
        action: "create_flashcards",
        target: "content",
      },
      {
        regex:
          /(make|create|generate)\s+(notes?)\s+(?:from|about|on|for)\s+(.+)/i,
        action: "create_notes",
        target: "content",
      },
      {
        regex: /(schedule|plan|chedule|shedule|scedule)\s+(?:my|the)?\s*(.+)/i,
        action: "create_schedule",
        target: "content",
      },
      // CRUD: delete/remove schedule items
      {
        regex:
          /(delete|remove|clear)\s+(?:the\s+)?(exam|class|assignment|event|note)(?:\s+for\s+(.+))?/i,
        action: "delete_item",
        target: "schedule",
      },
      // CRUD: reschedule/update time
      {
        regex:
          /(reschedule|move|update)\s+(?:the\s+)?(exam|class|assignment|event)\s+(.*)/i,
        action: "reschedule_item",
        target: "schedule",
      },
      // Notes/flashcards CRUD simple forms
      {
        regex: /(delete|remove)\s+note\s+(.*)/i,
        action: "delete_note",
        target: "notes",
      },
      {
        regex: /(delete|remove)\s+flashcard\s+(.*)/i,
        action: "delete_flashcard",
        target: "flashcards",
      },
      {
        regex: /remember\s+(.+)/i,
        action: "remember",
        target: "memory",
      },
      {
        regex: /remind\s+me\s+(.+)/i,
        action: "remind",
        target: "reminder",
      },
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        commands.push({
          action: pattern.action,
          target: pattern.target,
          params: { content: match.slice(1).join(" ") },
        });
      }
    }

    return commands;
  }

  private async executeCommand(
    command: { action: string; target: string; params: any },
    input: AgentTaskInput
  ): Promise<AgentResult> {
    switch (command.action) {
      case "create_both": {
        // Handle compound creation of both notes and flashcards
        const notesResult = await new NotesAgent().run(input);

        // Extract topic for flashcards and enhance if needed
        const topic = command.params.content
          ?.replace(
            /^(make|create|generate)\s+.*?(?:from|about|on|for)\s+/i,
            ""
          )
          .trim();
        let enhancedInput = { ...input };

        if (topic && topic.length < 50) {
          enhancedInput.text = `Please create flashcards about ${topic}. Include key concepts, definitions, and important information about ${topic}.`;
        }

        const flashcardsResult = await new FlashcardAgent().run(enhancedInput);

        return {
          summary: `${notesResult.summary} ${flashcardsResult.summary}`,
          artifacts: {
            ...notesResult.artifacts,
            ...flashcardsResult.artifacts,
          },
        };
      }
      case "create_flashcards": {
        // Extract topic from the command and enhance if needed
        const topic = command.params.content
          ?.replace(
            /^(make|create)\s+(flashcards?)\s+(?:from|about|on)\s+/i,
            ""
          )
          .trim();
        let enhancedInput = { ...input };

        if (topic && topic.length < 50) {
          // Enhance short topics with AI-friendly content
          enhancedInput.text = `Please create flashcards about ${topic}. Include key concepts, definitions, and important information about ${topic}.`;
        }

        return await new FlashcardAgent().run(enhancedInput);
      }
      case "create_notes":
        return await new NotesAgent().run(input);
      case "create_schedule":
        return await new PlannerAgent().run(input);
      case "delete_item": {
        const raw = (command.params.content || "").toLowerCase();
        const type = (raw.match(/\b(exam|class|assignment|event)\b/) || [])[1];
        const kw = (raw.match(/\b(?:for|about|on)\s+([^,.;]+)/i) ||
          [])[1]?.trim();
        const all = ScheduleStorage.load();
        const toRemove = all.filter((it) => {
          const matchType = type ? _norm(it.type).includes(type) : true;
          const matchKw = kw ? _norm(it.title).includes(_norm(kw)) : true;
          return matchType && matchKw;
        });
        const remain = all.filter((it) => !toRemove.includes(it));
        const removed = toRemove.length;
        if (removed > 0) ScheduleStorage.save(remain);
        return {
          summary:
            removed > 0
              ? `Removed ${removed} schedule item(s).`
              : "I couldn't find a matching schedule item to delete.",
          artifacts: { schedule: remain },
        };
      }
      case "reschedule_item": {
        const txt = command.params.content || "";
        const all = ScheduleStorage.load();
        // naive match by keyword before new time/date in same sentence
        const parts = txt.split(/\bto\b/i);
        const left = parts[0] || txt;
        const kw = left
          .replace(/^(for|about|on)\s+/i, "")
          .trim()
          .toLowerCase();
        const type = (txt
          .toLowerCase()
          .match(/\b(exam|class|assignment|event)\b/) || [])[1];
        const candidates = all.filter((it) => {
          const matchType = type ? _norm(it.type).includes(type) : true;
          const matchKw = kw ? _norm(it.title).includes(kw) : true;
          return matchType && matchKw;
        });
        const parsed = parseScheduleCommand(txt);
        let updated = 0;
        if (candidates.length && parsed.length) {
          const p = parsed[0];
          candidates.forEach((it) => {
            it.date = p.date || it.date;
            it.time = p.time || it.time;
          });
          ScheduleStorage.save(all);
          updated = candidates.length;
        }
        return {
          summary:
            updated > 0
              ? `Updated ${updated} schedule item(s).`
              : "I couldn't parse a new time/date or find the item to update.",
          artifacts: { schedule: ScheduleStorage.load() },
        };
      }
      case "delete_note": {
        const q = (command.params.content || "").toLowerCase();
        const all = NotesStorage.load();
        const remain = all.filter(
          (n) => !`${n.title} ${n.source}`.toLowerCase().includes(q)
        );
        const removed = all.length - remain.length;
        if (removed > 0) NotesStorage.save(remain);
        return {
          summary:
            removed > 0
              ? `Removed ${removed} note(s).`
              : "I couldn't find a matching note to delete.",
          artifacts: { notes: remain },
        };
      }
      case "delete_flashcard": {
        const q = (command.params.content || "").toLowerCase();
        const all = FlashcardStorage.load();
        const remain = all.filter(
          (c) =>
            !`${c.question} ${c.answer} ${c.category}`.toLowerCase().includes(q)
        );
        const removed = all.length - remain.length;
        if (removed > 0) FlashcardStorage.save(remain as any);
        return {
          summary:
            removed > 0
              ? `Removed ${removed} flashcard(s).`
              : "I couldn't find a matching flashcard to delete.",
          artifacts: { flashcards: remain },
        };
      }
      case "remember":
        // Store in buddy memory
        BuddyMemoryStorage.addTopics([command.params.content]);
        return {
          summary: `I'll remember that: ${command.params.content}`,
        };
      case "remind":
        return {
          summary: `I'll remind you about: ${command.params.content}`,
        };
      default:
        return {
          summary: "I'm not sure how to handle that command yet.",
        };
    }
  }
}

// Enhanced Orchestrator with advanced routing and fallback handling
export class Orchestrator {
  constructor(private agents: Agent[]) {}

  // High-level router with advanced multi-tool support and fallback handling
  async handle(input: AgentTaskInput): Promise<AgentResult> {
    const text = (input.text || "").trim();
    const parsed = parseIntent(text);

    // Enhanced intent detection with fallback and typo tolerance
    const wantsFlash = parsed.type === "flashcards" || /flashcards?/.test(text);
    const wantsNotes = parsed.type === "notes" || /notes?/.test(text);
    const wantsSchedule =
      parsed.type === "schedule" ||
      /(schedule|calendar|timetable|chedule|shedule|scedule)/.test(text);
    const wantsFun =
      parsed.type === "fun" ||
      /(story|quiz|poem|song|rap|riddle|game)/i.test(text);
    const wantsCommand =
      /(make|create|generate|help|remember|remind|delete|remove|clear|reschedule|move|update)/i.test(
        text
      );
    // Enhanced schedule Q&A detection - should go to BuddyAgent first
    const isScheduleQA =
      (/\b(do\s+i\s+have|what\s+do\s+i\s+have|when\s+is|is\s+there|any\s+exam|what.*exam|exam.*when)\b/i.test(
        text
      ) &&
        /(exam|class|assignment|event|test|quiz|tomorrow|today|next|this|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(
          text
        )) ||
      /\b(exam.*tomorrow|exam.*today|class.*tomorrow|class.*today|test.*tomorrow|test.*today)\b/i.test(
        text
      );

    // Multi-action: run selected tools in sequence and aggregate summaries
    const results: AgentResult[] = [];

    try {
      // Handle schedule Q&A first via BuddyAgent
      if (isScheduleQA) {
        const result = await new BuddyAgent().run({
          ...input,
          intent: "buddy",
        });
        return result; // Return immediately for schedule Q&A
      }

      if (wantsNotes) {
        const result = await new NotesAgent().run({
          ...input,
          intent: "notes",
        });
        results.push(result);
      }

      if (wantsFlash) {
        // For flashcard creation, use CommandAgent to get better content expansion
        const result = await new CommandAgent().run({
          ...input,
          intent: "flashcards",
        });
        results.push(result);
      }

      if (wantsSchedule) {
        const result = await new PlannerAgent().run({
          ...input,
          intent: "schedule",
        });
        results.push(result);
      }

      if (wantsFun) {
        const result = await new FunAgent().run({ ...input, intent: "fun" });
        results.push(result);
      }

      if (wantsCommand && results.length === 0) {
        const result = await new CommandAgent().run({
          ...input,
          intent: "command",
        });
        results.push(result);
      }

      if (results.length) {
        return {
          summary: results.map((r) => r.summary).join(" "),
          artifacts: Object.assign(
            {},
            ...results.map((r) => r.artifacts || {})
          ),
        };
      }
    } catch (error) {
      console.error("Multi-agent execution failed:", error);
      // Fallback to buddy agent
    }

    // Otherwise pick best matching agent or default Buddy
    try {
      const a =
        this.agents.find((ag) =>
          ag.canHandle({ ...input, intent: parsed.type })
        ) || new BuddyAgent();
      return await a.run({ ...input, intent: parsed.type });
    } catch (error) {
      console.error("Agent execution failed:", error);
      // Final fallback
      return {
        summary:
          "I'm here to help! Try asking me to make notes, flashcards, or a schedule. I can also remember your preferences and help you study smarter.",
      };
    }
  }
}

// Default orchestrator factory with enhanced agents
export function createDefaultOrchestrator() {
  return new Orchestrator([
    new CommandAgent(), // Add command agent first for complex commands
    new NotesAgent(),
    new PlannerAgent(),
    new FlashcardAgent(),
    new FunAgent(),
    new BuddyAgent(),
  ]);
}

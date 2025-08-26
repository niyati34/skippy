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
import { parseTimetableFast, parseTC4Schedule, type ParsedTimetableClass } from "@/lib/timetableParser";

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
    const personality = mem.tone === "formal" ? "respectful and professional" : "friendly and encouraging";
    
    // Try a concise AI reply when text exists
    if (input.text && input.text.trim().length > 0) {
      const sys: ChatMessage = {
        role: "system",
        content: `You are Skippy, an AI study buddy${name}. Be ${personality}. Be concise and plain text only. No emojis, no markdown. 2–4 short sentences. Ask at most one clarifying question. Remember the student's preferences and past interactions.`,
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
        summary: "I had trouble creating notes. Let me try a different approach or you can try uploading the content again.",
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
          const scheduleItems = tc4Classes.map(cls => ({
            title: cls.title,
            date: new Date().toISOString().split('T')[0], // Today's date
            time: cls.time,
            type: "assignment" as const,
            source: cls.source,
          }));
          ScheduleStorage.addBatch(scheduleItems);
          
          BuddyMemoryStorage.logTask("schedule", `Added ${tc4Classes.length} TC4 classes`);
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
        const scheduleItems = fastResult.classes.map(cls => ({
          title: cls.title,
          date: new Date().toISOString().split('T')[0],
          time: cls.time,
          type: "assignment" as const,
          source: cls.source,
        }));
        ScheduleStorage.addBatch(scheduleItems);
        
        BuddyMemoryStorage.logTask("schedule", `Added ${fastResult.classes.length} classes via fast parser`);
        return {
          summary: `Quickly extracted ${fastResult.classes.length} classes from your schedule with ${Math.round(fastResult.confidence * 100)}% confidence! They're now in your timetable.`,
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
      BuddyMemoryStorage.logTask("schedule", `Added ${saved.length} items via AI`);
      return {
        summary: saved.length
          ? `Added ${saved.length} items to your schedule using AI analysis.`
          : "I didn't find clear dates or times. Add specific dates/times or upload a schedule file.",
        artifacts: { schedule: saved },
      };
    } catch (error) {
      console.error("AI schedule generation failed:", error);
      return {
        summary: "I had trouble processing your schedule. Please make sure it contains clear dates and times, or try uploading a different format.",
      };
    }
  }
}

// Enhanced Flashcard Agent with better content processing
export class FlashcardAgent implements Agent {
  name = "Flashcard";
  canHandle(i: AgentTaskInput) {
    return /flashcard|practice|quiz|revise|test/i.test(i.intent || i.text || "");
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const source = input.files?.[0]?.name || "chat-input";
    const text =
      input.text || input.files?.map((f) => f.content).join("\n\n") || "";
    
    try {
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
          ? `Created ${saved.length} flashcards from your content. They're ready for practice!`
          : "I couldn't extract enough content to make flashcards. Try adding more detail or paste text.",
        artifacts: { flashcards: saved },
      };
    } catch (error) {
      console.error("Flashcard generation failed:", error);
      return {
        summary: "I had trouble creating flashcards. Please provide more detailed content or try a different approach.",
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
        summary: "I had trouble creating that fun content. Let me try something else or you can ask for a different type of learning activity.",
      };
    }
  }
}

// New Command Agent for advanced natural language processing
export class CommandAgent implements Agent {
  name = "Command";
  canHandle(i: AgentTaskInput) {
    // Handle complex multi-step commands
    return /(make|create|generate|do|help|remember|remind)/i.test(i.intent || i.text || "");
  }
  
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const text = input.text || "";
    const mem = BuddyMemoryStorage.load();
    
    // Enhanced command parsing
    const commands = this.parseCommands(text);
    
    if (commands.length === 0) {
      return {
        summary: "I'm not sure what you'd like me to do. Try saying something like 'make flashcards from this' or 'create a schedule'.",
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
    
    BuddyMemoryStorage.logTask("command", `Executed ${commands.length} commands`);
    
    return {
      summary: results.join(" "),
      artifacts,
    };
  }
  
  private parseCommands(text: string): Array<{action: string, target: string, params: any}> {
    const commands: Array<{action: string, target: string, params: any}> = [];
    
    // Multi-step command patterns
    const patterns = [
      {
        regex: /(make|create)\s+(flashcards?)\s+(?:from|about|on)\s+(.+)/i,
        action: "create_flashcards",
        target: "content"
      },
      {
        regex: /(make|create)\s+(notes?)\s+(?:from|about|on)\s+(.+)/i,
        action: "create_notes", 
        target: "content"
      },
      {
        regex: /(schedule|plan)\s+(?:my|the)\s+(.+)/i,
        action: "create_schedule",
        target: "content"
      },
      {
        regex: /remember\s+(.+)/i,
        action: "remember",
        target: "memory"
      },
      {
        regex: /remind\s+me\s+(.+)/i,
        action: "remind",
        target: "reminder"
      }
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        commands.push({
          action: pattern.action,
          target: pattern.target,
          params: { content: match[2] || match[1] }
        });
      }
    }
    
    return commands;
  }
  
  private async executeCommand(command: {action: string, target: string, params: any}, input: AgentTaskInput): Promise<AgentResult> {
    switch (command.action) {
      case "create_flashcards":
        return await new FlashcardAgent().run(input);
      case "create_notes":
        return await new NotesAgent().run(input);
      case "create_schedule":
        return await new PlannerAgent().run(input);
      case "remember":
        // Store in buddy memory
        BuddyMemoryStorage.addTopics([command.params.content]);
        return {
          summary: `I'll remember that: ${command.params.content}`
        };
      case "remind":
        return {
          summary: `I'll remind you about: ${command.params.content}`
        };
      default:
        return {
          summary: "I'm not sure how to handle that command yet."
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
    
    // Enhanced intent detection with fallback
    const wantsFlash = parsed.type === "flashcards" || /flashcards?/.test(text);
    const wantsNotes = parsed.type === "notes" || /notes?/.test(text);
    const wantsSchedule = parsed.type === "schedule" || /(schedule|calendar|timetable)/.test(text);
    const wantsFun = parsed.type === "fun" || /(story|quiz|poem|song|rap|riddle|game)/i.test(text);
    const wantsCommand = /(make|create|generate|do|help|remember|remind)/i.test(text);

    // Multi-action: run selected tools in sequence and aggregate summaries
    const results: AgentResult[] = [];
    
    try {
      if (wantsNotes) {
        const result = await new NotesAgent().run({ ...input, intent: "notes" });
        results.push(result);
      }
      
      if (wantsFlash) {
        const result = await new FlashcardAgent().run({ ...input, intent: "flashcards" });
        results.push(result);
      }
      
      if (wantsSchedule) {
        const result = await new PlannerAgent().run({ ...input, intent: "schedule" });
        results.push(result);
      }
      
      if (wantsFun) {
        const result = await new FunAgent().run({ ...input, intent: "fun" });
        results.push(result);
      }
      
      if (wantsCommand && results.length === 0) {
        const result = await new CommandAgent().run({ ...input, intent: "command" });
        results.push(result);
      }

      if (results.length) {
        return {
          summary: results.map((r) => r.summary).join(" "),
          artifacts: Object.assign({}, ...results.map((r) => r.artifacts || {})),
        };
      }
    } catch (error) {
      console.error("Multi-agent execution failed:", error);
      // Fallback to buddy agent
    }

    // Otherwise pick best matching agent or default Buddy
    try {
      const a = this.agents.find((ag) =>
        ag.canHandle({ ...input, intent: parsed.type })
      ) || new BuddyAgent();
      return await a.run({ ...input, intent: parsed.type });
    } catch (error) {
      console.error("Agent execution failed:", error);
      // Final fallback
      return {
        summary: "I'm here to help! Try asking me to make notes, flashcards, or a schedule. I can also remember your preferences and help you study smarter.",
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

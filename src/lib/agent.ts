// Advanced multi-agent orchestrator with memory and tool use
import { parseIntent } from "@/lib/intent";
import { universalAI } from "@/lib/universalAgent";
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

// Enhanced Notes Agent with Universal AI integration
export class NotesAgent implements Agent {
  name = "Notes";
  canHandle(i: AgentTaskInput) {
    return /note|summar|study|extract/i.test(i.intent || i.text || "");
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    const source = input.files?.[0]?.name || "chat-input";
    const text =
      input.text || input.files?.map((f) => f.content).join("\n\n") || "";

    console.log("📝 [NotesAgent] Input text:", text);

    try {
      // Use Universal Agentic AI for intelligent notes generation
      console.log("🤖 [NotesAgent] Using Universal Agentic AI for processing");
      const result = await universalAI.processAnyPrompt({ text });

      if (result.artifacts?.notes && result.artifacts.notes.length > 0) {
        const notes = result.artifacts.notes;
        console.log(
          "✅ [NotesAgent] Universal AI generated:",
          notes.length,
          "notes"
        );
        // Universal AI already handles saving via NotesStorage in its own flow.
        // Avoid double-saving; just return artifacts as-is.
        BuddyMemoryStorage.logTask(
          "notes",
          `Processed ${notes.length} notes via Universal AI`
        );
        return {
          summary:
            result.summary ||
            `Prepared ${notes.length} structured notes using advanced AI processing.`,
          artifacts: { notes },
        };
      } else {
        console.warn(
          "⚠️ [NotesAgent] Universal AI returned no notes, using fallback"
        );
        // Fallback to old method if Universal AI fails
        return await this.fallbackNotesGeneration(text, source);
      }
    } catch (error) {
      console.error("🚨 [NotesAgent] Universal AI failed:", error);
      // Fallback to old method
      return await this.fallbackNotesGeneration(text, source);
    }
  }

    private async fallbackNotesGeneration(
    text: string,
    source: string
  ): Promise<AgentResult> {
    console.log("🔄 [NotesAgent] Using fallback notes generation");

    try {
      // If the text is a simple topic request (like "history"), create structured notes
      if (text.length < 100 && !text.includes('\n')) {
        const topic = text.trim();
        const structuredNote = {
          title: `Study Notes: ${topic}`,
          content: `# Study Notes: ${topic}

## Key Concepts
- Fundamental principles of ${topic}
- Important historical developments
- Core theories and applications

## Main Topics
1. Introduction to ${topic}
2. Key principles and concepts
3. Historical significance
4. Modern applications
5. Study tips and resources

## Summary
Comprehensive study material covering the essential aspects of ${topic} for effective learning and understanding.`,
          source: "Generated",
          category: topic.charAt(0).toUpperCase() + topic.slice(1),
          tags: [topic.toLowerCase(), "study", "notes"],
        };

        const saved = NotesStorage.addBatch([structuredNote]);
        BuddyMemoryStorage.logTask("notes", `Added structured notes for ${topic}`);
        
        return {
          summary: `Created comprehensive study notes about ${topic}. They're now saved and ready for review!`,
          artifacts: { notes: saved },
        };
      }

      // Otherwise, use the AI service
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

// Enhanced Flashcard Agent with Universal AI integration
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

    try {
      // Use Universal Agentic AI for intelligent flashcard generation
      console.log(
        "🤖 [FlashcardAgent] Using Universal Agentic AI for processing"
      );
      const result = await universalAI.processAnyPrompt({ text });

      if (
        result.artifacts?.flashcards &&
        result.artifacts.flashcards.length > 0
      ) {
        const flashcards = result.artifacts.flashcards;
        console.log(
          "✅ [FlashcardAgent] Universal AI generated:",
          flashcards.length,
          "flashcards"
        );
        // Avoid double-saving; Universal pipeline may have already saved.
        BuddyMemoryStorage.logTask(
          "flashcards",
          `Processed ${flashcards.length} cards via Universal AI`
        );
        return {
          summary:
            result.summary ||
            `Prepared ${flashcards.length} flashcards using advanced AI processing.`,
          artifacts: { flashcards },
        };
      } else {
        console.warn(
          "⚠️ [FlashcardAgent] Universal AI returned no flashcards, using fallback"
        );
        // Fallback to old method if Universal AI fails
        return await this.fallbackFlashcardGeneration(text, source);
      }
    } catch (error) {
      console.error("🚨 [FlashcardAgent] Universal AI failed:", error);
      // Fallback to old method
      return await this.fallbackFlashcardGeneration(text, source);
    }
  }

  private async fallbackFlashcardGeneration(
    text: string,
    source: string
  ): Promise<AgentResult> {
    console.log("🔄 [FlashcardAgent] Using fallback flashcard generation");

    // If text is too short, try to expand it with basic topic context
    let content = text;
    // If command-like phrase present, extract the topic and enrich
    const cmdMatch = content.match(
      /(?:make|create|generate)\s+flash\s*cards?\s+(?:from|about|on|for)\s+([^\n.,;]+)/i
    );
    if (cmdMatch) {
      const topic = cmdMatch[1].trim();
      content = `Please create flashcards about ${topic}. Include key concepts, definitions, and important information about ${topic}.`;
      console.log("✨ [FlashcardAgent] Enriched from command phrase:", content);
    } else if (content.length < 20 && content.trim()) {
      // Enhance short topics like "AI" with some context
      const topic = content.trim();
      content = `Please create flashcards about ${topic}. Include key concepts, definitions, and important information about ${topic}.`;
      console.log("✨ [FlashcardAgent] Enhanced content:", content);
    }

    // Extract optional difficulty and target count from text
    const difficulty = (text.match(
      /\b(beginner|easy|intermediate|advanced|hard)\b/i
    ) || [])[1]?.toLowerCase();
    
    // Enhanced count extraction - look for patterns like "5 flashcards of math"
    const countStr =
      (text.match(/\b(\d{1,3})\s*(?:cards?|flash\s*cards?)\b/i) || [])[1] ||
      (text.match(/(?:make|create|generate)\s*(\d{1,3})\s*flash\s*cards?/i) || [])[1] ||
      (text.match(/(?:make|create|generate)\s*(\d{1,3})\b/i) || [])[1] ||
      // New pattern: "5 flashcards of math" or "5 flashcard of math"
      (text.match(/(\d{1,3})\s*flash\s*cards?\s+(?:of|about|on|for)\s+/i) || [])[1];
    
    const targetCount = countStr
      ? Math.max(1, Math.min(100, Number(countStr)))
      : undefined;
    
    console.log(`🎯 [FlashcardAgent] Target count: ${targetCount}, Difficulty: ${difficulty}`);

    try {
      console.log(
        "🔄 [FlashcardAgent] Calling generateFlashcards with content length:",
        content.length
      );
      const cards = await generateFlashcards(content, {
        count: targetCount,
        difficulty,
      });
      console.log("📋 [FlashcardAgent] Generated cards:", cards?.length || 0);
      let mapped = (cards || []).map((c: any) => ({
      question: c.question || c.front || "Question",
      answer: c.answer || c.back || "Answer",
      category: c.category || "General",
    }));
      if (!mapped.length) {
        const topicMatch =
          (content.match(/about\s+([^\n.,;]+)/i) || [])[1] ||
          (text || "the topic").trim();
        const t = topicMatch.replace(/\s+/g, " ").trim();
        const cat = t.split(" ")[0].replace(/[^A-Za-z0-9]/g, "");
        console.warn(
          "⚠️ [FlashcardAgent] AI returned no cards, using heuristic fallback for:",
          t
        );
        mapped = [
          {
            question: `What is ${t}?`,
            answer: `${t} in one sentence with a simple example.`,
            category: cat || "General",
          },
          {
            question: `List 2-3 applications of ${t}.`,
            answer: `e.g., A, B, and sometimes C.`,
            category: cat || "General",
          },
          {
            question: `Give a basic example of ${t}.`,
            answer: `Describe a small real-world use case showing ${t}.`,
            category: cat || "General",
          },
          {
            question: `One key benefit of ${t}?`,
            answer: `Improved efficiency/accuracy vs. traditional methods (context-dependent).`,
            category: cat || "General",
          },
          {
            question: `One limitation of ${t}?`,
            answer: `Data quality, cost, or interpretability can be issues.`,
            category: cat || "General",
          },
        ];
      }

      // If a target count was requested and we have fewer cards, pad heuristically
      if (targetCount && mapped.length < targetCount) {
        const topic =
          (content.match(/about\s+([^\n.,;]+)/i) || [])[1] ||
          (text || "the topic").trim();
        const base = topic.replace(/\s+/g, " ").trim();
        const padCount = Math.min(100, targetCount) - mapped.length;
        for (let i = 1; i <= padCount; i++) {
          mapped.push({
            question: `Advanced check ${i}: A key concept about ${base}?`,
            answer: `A concise, accurate point about ${base}.`,
            category: (base.split(" ")[0] || "General").replace(
              /[^A-Za-z0-9]/g,
              ""
            ),
          });
        }
      }
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
    const kind = match.toLowerCase();

    try {
      const out = await generateFunLearning(
        text || "Make it educational",
        kind
      );
      BuddyMemoryStorage.logTask("fun", `Created ${kind}`);
    return {
        summary: `Created a fun ${kind} for you! Check the Fun Learning section to enjoy it.`,
        artifacts: { fun: { type: kind, content: out } },
      };
    } catch (error) {
      console.error("Fun content generation failed:", error);
      return {
        summary:
          "I had trouble creating that fun content. Try another type (story, quiz, poem) or provide a short topic.",
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
    const seenActions = new Set<string>();

    // JSON-first parsing: if input contains a JSON object/array describing commands
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const actionRaw = (item.action || item.type || "")
            .toString()
            .toLowerCase();
          const target = (item.target || "content").toString();
          const content =
            item.content || item.topic || item.text || item.query || "";
          const actionMap: Record<string, string> = {
            flashcards: "create_flashcards",
            notes: "create_notes",
            schedule: "create_schedule",
            create: "create_notes",
            make: "create_notes",
            generate: "create_notes",
          };
          const action = actionMap[actionRaw] || actionRaw || "";
          if (!action) continue;
          const key = `${action}`;
          if (seenActions.has(key)) continue;
          seenActions.add(key);
          const params: any = { content };
          if (item.count) params.count = Number(item.count);
          if (item.difficulty)
            params.difficulty = String(item.difficulty).toLowerCase();
          commands.push({ action, target, params });
        }
      }
    } catch (e) {
      console.warn("[CommandAgent] JSON parse failed, falling back to regex.");
    }

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
          /(make|create|generate)\s+(flash\s*cards?)\s+(?:from|about|on|for)\s+(.+)/i,
        action: "create_flashcards",
        target: "content",
      },
      {
        regex:
          /(make|create|generate)\s+(notes?)\s+(?:from|about|on|for)\s+(.+)/i,
        action: "create_notes",
        target: "content",
      },
      // Bare flashcards phrases like "advanced flashcards from blockchain" or "40 flashcards"
      {
        regex: /flash\s*cards?\s+(?:from|about|on|for)\s+(.+)/i,
        action: "create_flashcards",
        target: "content",
      },
      {
        regex: /\b(\d{1,3})\s*flash\s*cards?\b/i,
        action: "create_flashcards",
        target: "content",
      },
      // e.g., "create50 flashcards from X" or "make50 flash card about X"
      {
        regex:
          /(make|create|generate)\s*(\d{1,3})\s*flash\s*cards?\b.*?(?:from|about|on|for)\s+(.+)/i,
        action: "create_flashcards",
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
      // NEW: Delete all commands
      {
        regex: /(delete|remove|clear)\s+all\s+(notes?|flashcards?|cards?)/i,
        action: "delete_all",
        target: "all",
      },
      {
        regex: /(delete|remove|clear)\s+all\s+(notes?|flashcards?|cards?)\s+and\s+(notes?|flashcards?|cards?)/i,
        action: "delete_all",
        target: "all",
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
        // Prefer the last capture group as primary content/topic
        const content = (match[match.length - 1] || "").trim();
        const key = `${pattern.action}`;
        if (seenActions.has(key)) continue;
        seenActions.add(key);
        // Extract optional count/difficulty modifiers from the full text
        const cnt =
          (text.match(/\b(\d{1,3})\s*(?:cards?|flash\s*cards?)\b/i) || [])[1] ||
          (text.match(
            /(?:make|create|generate)\s*(\d{1,3})\s*flash\s*cards?/i
          ) || [])[1] ||
          undefined;
        const diff = (text.match(
          /\b(beginner|easy|intermediate|advanced|hard)\b/i
        ) || [])[1];
        commands.push({
          action: pattern.action,
          target: pattern.target,
          params: {
            content,
            ...(cnt ? { count: Number(cnt) } : {}),
            ...(diff ? { difficulty: diff } : {}),
          },
        });
      }
    }

    // If nothing matched but the user mentioned flashcards, create a default command
    if (commands.length === 0 && /flash\s*cards?/i.test(text)) {
      const topic =
        (text.match(/(?:from|about|on|for)\s+([^,.;\n]+)/i) || [])[1] || "";
      const cnt =
        (text.match(/\b(\d{1,3})\s*(?:cards?|flash\s*cards?)\b/i) || [])[1] ||
        (text.match(/(?:make|create|generate)\s*(\d{1,3})\s*flash\s*cards?/i) ||
          [])[1] ||
        undefined;
      const diff = (text.match(
        /\b(beginner|easy|intermediate|advanced|hard)\b/i
      ) || [])[1];
      commands.push({
        action: "create_flashcards",
        target: "content",
        params: {
          content: topic,
          ...(cnt ? { count: Number(cnt) } : {}),
          ...(diff ? { difficulty: diff } : {}),
        },
      });
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
        // Extract topic from params or fallback to parsing input text
        let topic = (command.params.content || "").trim();
        if (!topic || /\b(make|create|generate)\b/i.test(topic)) {
          const m = (input.text || "").match(
            /(?:from|about|on|for)\s+([^,.;\n]+)/i
          );
          if (m) topic = m[1].trim();
        }
        let enhancedInput = { ...input };

        if (topic && topic.length < 120) {
          // Preserve user modifiers like difficulty and count (from text or structured params)
          const diff =
            command.params.difficulty ||
            (input.text || "").match(
              /\b(beginner|easy|intermediate|advanced|hard)\b/i
            )?.[1];
          const cnt =
            command.params.count ||
            (input.text || "").match(
              /\b(\d{1,3})\s*(?:cards?|flashcards?)\b/i
            )?.[1];
          const mods = [
            diff ? ` Make it ${String(diff).toLowerCase()}.` : "",
            cnt ? ` Create exactly ${cnt} cards.` : "",
          ].join("");
          enhancedInput.text = `Please create flashcards about ${topic}. Include key concepts, definitions, and important information about ${topic}.${mods}`;
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
        
        // More precise matching - only delete if exact match or very close
        const toRemove = all.filter((c) => {
          const question = c.question.toLowerCase();
          const answer = c.answer.toLowerCase();
          const category = c.category.toLowerCase();
          
          // Exact match on any field
          if (question === q || answer === q || category === q) return true;
          
          // Close match (contains the query as a word)
          const words = q.split(/\s+/);
          return words.some(word => 
            question.includes(word) || answer.includes(word) || category.includes(word)
          );
        });
        
        const remain = all.filter(c => !toRemove.includes(c));
        const removed = toRemove.length;
        
        if (removed > 0) {
          FlashcardStorage.save(remain as any);
          console.log(`🗑️ [CommandAgent] Deleted ${removed} flashcards matching "${q}"`);
        }
        
        return {
          summary:
            removed > 0
              ? `Removed ${removed} flashcard(s) matching "${q}".`
              : `No flashcards found matching "${q}".`,
          artifacts: { flashcards: remain },
        };
      }
      case "delete_all": {
        const target = command.params.content || "";
        let notesDeleted = 0;
        let flashcardsDeleted = 0;
        
        // Delete all notes
        if (target.includes('note') || target.includes('all')) {
          const allNotes = NotesStorage.load();
          notesDeleted = allNotes.length;
          NotesStorage.save([]);
          console.log(`🗑️ [CommandAgent] Deleted all ${notesDeleted} notes`);
        }
        
        // Delete all flashcards
        if (target.includes('flashcard') || target.includes('card') || target.includes('all')) {
          const allFlashcards = FlashcardStorage.load();
          flashcardsDeleted = allFlashcards.length;
          FlashcardStorage.save([]);
          console.log(`🗑️ [CommandAgent] Deleted all ${flashcardsDeleted} flashcards`);
        }
        
        const totalDeleted = notesDeleted + flashcardsDeleted;
        
        if (totalDeleted > 0) {
          return {
            summary: `Deleted all items: ${notesDeleted} notes and ${flashcardsDeleted} flashcards.`,
            artifacts: { 
              notes: [], 
              flashcards: [],
              deleted: { notes: notesDeleted, flashcards: flashcardsDeleted }
            },
          };
        } else {
          return {
            summary: "No items found to delete.",
            artifacts: { notes: [], flashcards: [] },
          };
        }
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

// Enhanced Orchestrator with intelligent prompt understanding + existing multi-agent system
export class Orchestrator {
  constructor(private agents: Agent[]) {}

  // High-level router with intelligent prompt understanding + existing multi-agent system
  async handle(input: AgentTaskInput): Promise<AgentResult> {
    const text = (input.text || "").trim();
    
    console.log(`🧠 [Orchestrator] Processing: "${text}"`);
    
    // PRIORITY 1: Handle delete commands immediately (most important)
    if (/(delete|remove|clear)\s+all/i.test(text)) {
      console.log("🗑️ [Orchestrator] Delete command detected, using TaskUnderstanding immediately...");
      try {
        const { TaskUnderstanding } = await import('@/lib/taskUnderstanding');
        const { TaskExecutor } = await import('@/lib/taskExecutor');
        
        const taskRequest = TaskUnderstanding.understandRequest(text);
        console.log(`📋 [Orchestrator] Delete task request:`, taskRequest);
        
        if (taskRequest.actions && taskRequest.actions.length > 0) {
          const taskResults = await TaskExecutor.executeTask(taskRequest);
          console.log(`⚡ [Orchestrator] Delete task results:`, taskResults);
          
          const artifacts: any = {};
          const summaries: string[] = [];
          
          taskResults.forEach(result => {
            if (result.success) {
              summaries.push(result.message);
            }
          });
          
          const finalSummary = taskRequest.message + " " + summaries.join(" ");
          console.log(`🎯 [Orchestrator] Delete completed:`, { summary: finalSummary, artifacts });
          
          return {
            summary: finalSummary,
            artifacts: artifacts
          };
        }
      } catch (error) {
        console.error("🚨 [Orchestrator] TaskUnderstanding failed for delete:", error);
      }
    }
    
    // PRIORITY 2: Try the new Task Understanding system for other commands
    try {
      console.log("🧠 [Orchestrator] Trying new Task Understanding system...");
      
      const { TaskUnderstanding } = await import('@/lib/taskUnderstanding');
      const { TaskExecutor } = await import('@/lib/taskExecutor');
      
      const taskRequest = TaskUnderstanding.understandRequest(text);
      console.log(`📋 [Orchestrator] Task request:`, taskRequest);
      
      if (taskRequest.actions && taskRequest.actions.length > 0) {
        console.log(`✅ [Orchestrator] Task Understanding worked: ${taskRequest.actions.length} actions`);
        
        const taskResults = await TaskExecutor.executeTask(taskRequest);
        console.log(`⚡ [Orchestrator] Task results:`, taskResults);
        
        // Convert task results to orchestrator format
        const artifacts: any = {};
        const summaries: string[] = [];
        
        taskResults.forEach(result => {
          if (result.success) {
            summaries.push(result.message);
            
            // Add to artifacts based on what was created/deleted
            if (result.data) {
              if (Array.isArray(result.data)) {
                if (result.data.length > 0 && result.data[0].question) {
                  artifacts.flashcards = result.data;
                } else if (result.data.length > 0 && result.data[0].title && !result.data[0].question) {
                  artifacts.notes = result.data;
                }
              } else if (result.data.title && !result.data.question) {
                artifacts.notes = artifacts.notes || [];
                artifacts.notes.push(result.data);
              } else if (result.data.question) {
                artifacts.flashcards = artifacts.flashcards || [];
                artifacts.flashcards.push(result.data);
              }
            }
          }
        });
        
        const finalSummary = taskRequest.message + " " + summaries.join(" ");
        console.log(`🎯 [Orchestrator] Task Understanding result:`, { summary: finalSummary, artifacts });
        
        return {
          summary: finalSummary,
          artifacts: artifacts
        };
      }
      
      console.log("⚠️ [Orchestrator] Task Understanding didn't extract actions, trying intelligent prompt...");
      
    } catch (error) {
      console.error("🚨 [Orchestrator] Task Understanding failed:", error);
    }
    
    // Fallback: try intelligent prompt understanding
    try {
      console.log("🧠 [Orchestrator] Trying intelligent prompt understanding...");
      
      const { intelligentPromptOrchestrator } = await import('@/lib/intelligentPromptOrchestrator');
      const { actionExecutor } = await import('@/lib/actionExecutor');
      
      const promptResponse = await intelligentPromptOrchestrator.processNaturalLanguageCommand({
        userInput: text,
        context: {
          uploadedFiles: input.files || [],
          currentSubject: input.subject,
          studyMode: input.mode,
          recentActivity: input.context?.recentActivity
        }
      });
      
      console.log(`📋 [Orchestrator] Prompt response:`, promptResponse);
      
      if (promptResponse.actions && promptResponse.actions.length > 0) {
        console.log(`✅ [Orchestrator] Intelligent prompt understood: ${promptResponse.actions.length} actions`);
        
        const executionResults = await actionExecutor.executeActions(promptResponse, {
          uploadedFiles: input.files || [],
          currentSubject: input.subject,
          studyMode: input.mode,
          userInput: text
        });
        
        console.log(`⚡ [Orchestrator] Execution results:`, executionResults);
        
        const artifacts: any = {};
        const summaries: string[] = [];
        
        executionResults.forEach(result => {
          if (result.success && result.output) {
            console.log(`📊 [Orchestrator] Processing result for ${result.action}:`, result.output);
            switch (result.action) {
              case 'create_notes':
                artifacts.notes = artifacts.notes || [];
                artifacts.notes.push(result.output);
                summaries.push(result.output.message);
                break;
              case 'create_flashcards':
                artifacts.flashcards = artifacts.flashcards || [];
                artifacts.flashcards.push(result.output);
                summaries.push(result.output.message);
                break;
              case 'delete_flashcards':
                artifacts.deleted = artifacts.deleted || [];
                artifacts.deleted.push(result.output);
                summaries.push(result.output.message);
                break;
              case 'schedule_task':
                artifacts.schedule = artifacts.schedule || [];
                artifacts.schedule.push(result.output);
                summaries.push(result.output.message);
                break;
              case 'parse_timetable':
                artifacts.timetable = artifacts.timetable || [];
                artifacts.timetable.push(result.output);
                summaries.push(result.output.message);
                break;
              default:
                artifacts[result.action] = artifacts[result.action] || [];
                artifacts[result.action].push(result.output);
                summaries.push(result.output.message);
            }
          }
        });
        
        const finalSummary = promptResponse.message + " " + summaries.join(" ");
        console.log(`🎯 [Orchestrator] Intelligent prompt result:`, { summary: finalSummary, artifacts });
        
        return {
          summary: finalSummary,
          artifacts: artifacts,
          confidence: promptResponse.confidence
        };
      }
      
      console.log("⚠️ [Orchestrator] Intelligent prompt didn't extract actions, falling back to classic agents");
      
    } catch (error) {
      console.error("🚨 [Orchestrator] Intelligent prompt failed, using classic agents:", error);
    }

    // Fallback to existing multi-agent system
    try {
      console.log("🌟 [Orchestrator] Trying Universal Agentic AI as fallback...");
      const universalResult = await universalAI.processAnyPrompt(input);

      if (
        universalResult.artifacts &&
        Object.keys(universalResult.artifacts).length > 0
      ) {
        console.log("✅ [Orchestrator] Universal AI successfully handled the request");
        return universalResult;
      }

      if (
        universalResult.summary &&
        !universalResult.summary.includes("I'm not sure") &&
        !universalResult.summary.includes("encountered an issue")
      ) {
        console.log("✅ [Orchestrator] Universal AI provided meaningful response");
        return universalResult;
      }
    } catch (error) {
      console.error("🚨 [Orchestrator] Universal AI failed:", error);
    }

    // Fallback to existing multi-agent system
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
    const wantsDelete = parsed.type === "delete" || /(delete|remove|clear)\s+all/i.test(text);
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

      if (wantsDelete) {
        const result = await new CommandAgent().run({
          ...input,
          intent: "delete",
        });
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

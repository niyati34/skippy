// Task Executor - Executes any task from TaskUnderstanding
// Makes your agent truly capable of doing anything

import { TaskAction, TaskRequest } from "./taskUnderstanding";
import { NotesStorage, FlashcardStorage, ScheduleStorage } from "./storage";
import {
  generateFlashcardsWithGemini,
  generateNotesWithGemini,
} from "../services/geminiAI";

export interface TaskResult {
  success: boolean;
  message: string;
  data?: any;
  count?: number;
}

export class TaskExecutor {
  // Main method - executes any task request
  static async executeTask(request: TaskRequest): Promise<TaskResult[]> {
    const results: TaskResult[] = [];

    console.log(
      `⚡ [TaskExecutor] Executing ${request.actions.length} actions`
    );

    for (const action of request.actions) {
      try {
        const result = await this.executeAction(action);
        results.push(result);
      } catch (error) {
        console.error(`❌ [TaskExecutor] Action failed:`, error);
        results.push({
          success: false,
          message: `Failed to ${action.type} ${action.target}: ${error.message}`,
          data: null,
        });
      }
    }

    return results;
  }

  private static async executeAction(action: TaskAction): Promise<TaskResult> {
    console.log(`🎯 [TaskExecutor] Executing: ${action.type} ${action.target}`);

    // Defensive guards for unsupported actions
    if (!action || !action.type || !action.target) {
      return {
        success: false,
        message: "Invalid action - missing type or target",
        data: null,
      };
    }

    const supportedTypes = ["create", "delete", "update", "convert", "search"];
    const supportedTargets = [
      "notes",
      "flashcards",
      "schedule",
      "all",
      "content",
    ];

    if (!supportedTypes.includes(action.type)) {
      return {
        success: false,
        message: `❌ I can't "${action.type}" yet. I can: create, delete, update, convert, or search your study materials.`,
        data: null,
      };
    }

    if (!supportedTargets.includes(action.target)) {
      return {
        success: false,
        message: `❌ I can't work with "${action.target}". I can help with: notes, flashcards, schedule, or all items.`,
        data: null,
      };
    }

    switch (action.type) {
      case "delete":
        return this.executeDelete(action);
      case "create":
        return this.executeCreate(action);
      case "search":
        return this.executeSearch(action);
      case "update":
        return this.executeUpdate(action);
      case "convert":
        return this.executeConvert(action);
      default:
        return {
          success: false,
          message: `Handler not implemented for ${action.type} ${action.target}. Please try a different command.`,
          data: null,
        };
    }
  }

  private static async executeDelete(action: TaskAction): Promise<TaskResult> {
    const topic = (
      action.data && (action.data as any).topic
        ? String((action.data as any).topic)
        : ""
    )
      .toLowerCase()
      .trim();

    const isAllTopic = (t: string) =>
      !t || /^(all|everything|\*|any|all items|all of it|entire)$/i.test(t);

    const matchTopic = (text?: string) => {
      if (!topic) return true; // if no topic, match all
      const t = (text || "").toLowerCase();
      return t.includes(topic);
    };

    // Detect if the provided topic actually names collections to delete
    // e.g. "notes and flashcards", "all schedule items", "calendar & notes"
    const parseCollectionSelectors = (t: string) => {
      const set = new Set<"notes" | "flashcards" | "schedule">();
      const x = (t || "").toLowerCase();
      if (/\bnotes?\b|\bnots\b|\bnotez\b|\bnotess\b|\bnotebooks?\b/.test(x))
        set.add("notes");
      if (
        /\bflashcards?\b|\bflashcardd\b|\bflash\b|\bcards?\b|\bdecks?\b/.test(x)
      )
        set.add("flashcards");
      if (
        /\bschedules?\b|\bcalendar(s)?\b|\bcalender(s)?\b|\bevents?\b|\btimetables?\b|\breminders?\b/.test(
          x
        )
      )
        set.add("schedule");
      return set;
    };

    if (action.target === "all") {
      // Delete everything, optionally scoped by topic across each collection
      const notes = NotesStorage.load();
      const flashcards = FlashcardStorage.load();
      const schedule = ScheduleStorage.load();

      if (isAllTopic(topic)) {
        NotesStorage.save([]);
        FlashcardStorage.save([]);
        ScheduleStorage.save([]);
        const total = notes.length + flashcards.length + schedule.length;
        return {
          success: true,
          message: `Deleted all items: ${notes.length} notes, ${flashcards.length} flashcards, ${schedule.length} schedule items.`,
          count: total,
        };
      }

      // If the topic names collections (e.g., "notes and flashcards"), wipe only those
      const selectors = parseCollectionSelectors(topic);
      if (selectors.size > 0) {
        let removedNotes = 0;
        let removedFlash = 0;
        let removedSched = 0;

        if (selectors.has("notes")) {
          removedNotes = notes.length;
          NotesStorage.save([]);
        }
        if (selectors.has("flashcards")) {
          removedFlash = flashcards.length;
          FlashcardStorage.save([]);
        }
        if (selectors.has("schedule")) {
          removedSched = schedule.length;
          ScheduleStorage.save([]);
        }

        const parts: string[] = [];
        if (selectors.has("notes")) parts.push(`${removedNotes} notes`);
        if (selectors.has("flashcards"))
          parts.push(`${removedFlash} flashcards`);
        if (selectors.has("schedule"))
          parts.push(`${removedSched} schedule items`);
        const msg = parts.length ? parts.join(", ") : "nothing";

        return {
          success: true,
          message: `Deleted all in selected collections: ${msg}.`,
          count: removedNotes + removedFlash + removedSched,
        };
      }

      const keptNotes = notes.filter(
        (n) =>
          !matchTopic(n.title) &&
          !matchTopic(n.content) &&
          !matchTopic(n.category) &&
          !(n.tags || []).some((t) => matchTopic(t))
      );
      const keptFlash = flashcards.filter(
        (c) =>
          !matchTopic(c.question) &&
          !matchTopic(c.answer) &&
          !matchTopic(c.category)
      );
      const keptSched = schedule.filter((s) => !matchTopic(s.title));

      const removedNotes = notes.length - keptNotes.length;
      const removedFlash = flashcards.length - keptFlash.length;
      const removedSched = schedule.length - keptSched.length;

      NotesStorage.save(keptNotes);
      FlashcardStorage.save(keptFlash);
      ScheduleStorage.save(keptSched);

      const topicMsg = topic ? ` about "${topic}"` : "";
      return {
        success: true,
        message: `Deleted${topicMsg} items: ${removedNotes} notes, ${removedFlash} flashcards, ${removedSched} schedule items.`,
        count: removedNotes + removedFlash + removedSched,
      };
    }

    if (action.target === "notes") {
      const items = NotesStorage.load();
      if (isAllTopic(topic)) {
        NotesStorage.save([]);
        return {
          success: true,
          message: `Deleted all ${items.length} notes.`,
          count: items.length,
        };
      }
      const kept = items.filter(
        (n) =>
          !matchTopic(n.title) &&
          !matchTopic(n.content) &&
          !matchTopic(n.category) &&
          !(n.tags || []).some((t) => matchTopic(t))
      );
      const removed = items.length - kept.length;
      NotesStorage.save(kept);
      return {
        success: true,
        message: `Deleted ${removed} notes about "${topic}".`,
        count: removed,
      };
    }

    if (action.target === "flashcards") {
      const items = FlashcardStorage.load();
      // Treat empty topic or explicit 'all' as delete all
      if (isAllTopic(topic)) {
        FlashcardStorage.save([]);
        return {
          success: true,
          message: `Deleted all ${items.length} flashcards.`,
          count: items.length,
        };
      }
      const kept = items.filter(
        (c) =>
          !matchTopic(c.question) &&
          !matchTopic(c.answer) &&
          !matchTopic(c.category)
      );
      const removed = items.length - kept.length;
      FlashcardStorage.save(kept);
      return {
        success: true,
        message: `Deleted ${removed} flashcards about "${topic}".`,
        count: removed,
      };
    }

    if (action.target === "schedule") {
      const items = ScheduleStorage.load();
      if (isAllTopic(topic)) {
        ScheduleStorage.save([]);
        return {
          success: true,
          message: `Deleted all ${items.length} schedule items.`,
          count: items.length,
        };
      }
      const kept = items.filter((s) => !matchTopic(s.title));
      const removed = items.length - kept.length;
      ScheduleStorage.save(kept);
      return {
        success: true,
        message: `Deleted ${removed} schedule items about "${topic}".`,
        count: removed,
      };
    }

    return {
      success: false,
      message: `Unknown target for delete: ${action.target}`,
      data: null,
    };
  }

  private static async executeCreate(action: TaskAction): Promise<TaskResult> {
    if (action.target === "notes") {
      const topic = (action.data?.topic || "General").toString();

      // Prefer Gemini-generated rich notes; fallback to a simple template
      let generatedNotes: Array<{
        title: string;
        content: string;
        category?: string;
        tags?: string[];
      }> = [];
      try {
        generatedNotes = await generateNotesWithGemini(topic, "TaskExecutor");
      } catch (e) {
        console.warn(
          "⚠️ [TaskExecutor] Gemini notes generation failed, will fallback:",
          e
        );
      }

      const toSave = (
        generatedNotes && generatedNotes.length
          ? [generatedNotes[0]] // save only the first to respect singular "note" intent
          : [
              {
                title: `Enhanced Study Notes: ${topic}`,
                content: `# ${topic}\n\n## Key Concepts\n- Concept 1\n- Concept 2\n- Concept 3\n\n## Summary\nA concise overview of ${topic}.`,
                category: topic,
                tags: [topic.toLowerCase(), "generated"],
              },
            ]
      ).map((n) => ({
        title: n.title || `Study Notes: ${topic}`,
        content: n.content || `# ${topic}\n\nStudy notes about ${topic}.`,
        source: n.title?.includes("Gemini") ? "Gemini" : "Generated",
        category: n.category || topic,
        tags:
          Array.isArray(n.tags) && n.tags.length
            ? n.tags
            : [topic.toLowerCase()],
      }));

      const saved = NotesStorage.addBatch(toSave);
      return {
        success: true,
        message: `Created ${saved.length} note(s) about ${topic}.`,
        data: saved,
        count: saved.length,
      };
    }

    if (action.target === "flashcards") {
      const topic = (action.data?.topic || "General").toString();
      const count = Number(action.data?.count ?? 8) || 8;

      console.log(
        `🤖 [TaskExecutor] Requesting AI to generate ${count} flashcards for topic: "${topic}"`
      );

      // Try Gemini first; if it returns nothing, fall back to basic generation
      let aiCards: Array<{
        question: string;
        answer: string;
        category?: string;
      }> = [];
      try {
        aiCards = await generateFlashcardsWithGemini(topic, "TaskExecutor", {
          count,
          category: topic,
        });
      } catch (e) {
        console.warn(
          "⚠️ [TaskExecutor] Gemini generation failed, will fallback:",
          e
        );
      }

      const toSave = (
        aiCards && aiCards.length
          ? aiCards
          : Array.from({ length: count }, (_, i) => ({
              question: `What is a key concept of ${topic}? (Card ${i + 1})`,
              answer: `One key concept in ${topic} is ...`,
              category: topic,
            }))
      ).map((c) => ({
        question: c.question,
        answer: c.answer,
        category: c.category || topic,
      }));

      const saved = FlashcardStorage.addBatch(toSave);
      return {
        success: true,
        message: `Created ${saved.length} flashcards about ${topic}.`,
        data: saved,
        count: saved.length,
      };
    }

    if (action.target === "schedule") {
      const task = action.data?.task || "Study Task";
      // Prefer a parsed Date (from chrono) if provided
      const dt: Date | undefined = (action.data?.dateTime as Date) || undefined;
      const dateFromAction = action.data?.date as string | undefined;
      const timeFromAction = action.data?.time as string | undefined;

      const fmtLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const da = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${da}`;
      };
      const fmtLocalTime = (d: Date) => {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      };

      const date = dt
        ? fmtLocalDate(dt)
        : dateFromAction || fmtLocalDate(new Date());
      const time = dt ? fmtLocalTime(dt) : timeFromAction || "09:00";
      const scheduleItem = {
        title: task,
        date,
        time,
        type: "assignment" as const,
        source: "Generated",
      };

      const saved = ScheduleStorage.addBatch([scheduleItem]);
      return {
        success: true,
        message: `Added schedule item: ${task}.`,
        data: saved[0],
        count: 1,
      };
    }

    return {
      success: false,
      message: `Unknown target for create: ${action.target}`,
      data: null,
    };
  }

  private static async executeSearch(action: TaskAction): Promise<TaskResult> {
    if (action.target === "all") {
      const notes = NotesStorage.load();
      const flashcards = FlashcardStorage.load();
      const schedule = ScheduleStorage.load();

      return {
        success: true,
        message: `Found ${notes.length} notes, ${flashcards.length} flashcards, and ${schedule.length} schedule items.`,
        data: { notes, flashcards, schedule },
        count: notes.length + flashcards.length + schedule.length,
      };
    }

    if (action.target === "notes") {
      const notes = NotesStorage.load();
      return {
        success: true,
        message: `Found ${notes.length} notes.`,
        data: notes,
        count: notes.length,
      };
    }

    if (action.target === "flashcards") {
      const flashcards = FlashcardStorage.load();
      return {
        success: true,
        message: `Found ${flashcards.length} flashcards.`,
        data: flashcards,
        count: flashcards.length,
      };
    }

    if (action.target === "schedule") {
      const schedule = ScheduleStorage.load();
      return {
        success: true,
        message: `Found ${schedule.length} schedule items.`,
        data: schedule,
        count: schedule.length,
      };
    }

    return {
      success: false,
      message: `Unknown target for search: ${action.target}`,
      data: null,
    };
  }

  private static async executeUpdate(action: TaskAction): Promise<TaskResult> {
    // For now, just return search results
    return this.executeSearch(action);
  }

  // Minimal convert support: notes -> flashcards (topic-scoped if provided)
  private static async executeConvert(action: TaskAction): Promise<TaskResult> {
    const data = (action.data || {}) as any;
    const from = (data.from || "").toString();
    const to = (data.to || "").toString();
    const topic = data.topic ? String(data.topic) : undefined;
    const requestedCount = Math.max(1, Number(data.count ?? 8) || 8);

    if (from === "notes" && to.match(/^flash/)) {
      const notes = NotesStorage.load();
      const filter = (n: any) => {
        if (!topic) return true;
        const t = topic.toLowerCase();
        return (
          (n.title || "").toLowerCase().includes(t) ||
          (n.content || "").toLowerCase().includes(t) ||
          (n.category || "").toLowerCase().includes(t)
        );
      };
      const relevant = notes.filter(filter);
      if (relevant.length === 0) {
        return {
          success: false,
          message: `No notes found${
            topic ? ` about "${topic}"` : ""
          } to convert.`,
        };
      }

      // Aggregate candidate "answers" from relevant notes' content
      const topicLabel = topic || relevant[0].category || "General";
      const candidateLines: string[] = [];
      for (const n of relevant) {
        const content = String(n.content || "");
        // Prefer bullet points and headers, then fall back to sentences
        const bullets = content
          .split(/\n+/)
          .map((s) => s.trim())
          .filter((s) => /^(-|\*|\d+\.|#)/.test(s))
          .map((s) =>
            s
              .replace(/^[-*]\s*/, "")
              .replace(/^\d+\.\s*/, "")
              .replace(/^#+\s*/, "")
          );
        const sentences = content
          .replace(/\n+/g, " ")
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
        candidateLines.push(...bullets, ...sentences);
        if (candidateLines.length >= requestedCount * 2) break; // enough material
      }

      // Ensure we have at least requestedCount candidates
      while (candidateLines.length < requestedCount) {
        candidateLines.push(
          `Key point about ${topicLabel} #${candidateLines.length + 1}.`
        );
      }

      const selected = candidateLines.slice(0, requestedCount);
      const cards = selected.map((line: string, i: number) => ({
        question: `Q${i + 1}: What about ${topicLabel}?`,
        answer: line,
        category: topicLabel,
      }));

      const saved = FlashcardStorage.addBatch(cards);
      return {
        success: true,
        message: `Converted notes${topic ? ` about "${topic}"` : ""} into ${
          saved.length
        } flashcards.`,
        data: saved,
        count: saved.length,
      };
    }

    return {
      success: false,
      message: `Unsupported convert action: ${from} -> ${to}`,
    };
  }
}

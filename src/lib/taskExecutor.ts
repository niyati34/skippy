// Task Executor - Executes any task from TaskUnderstanding
// Makes your agent truly capable of doing anything

import { TaskAction, TaskRequest } from "./taskUnderstanding";
import { NotesStorage, FlashcardStorage, ScheduleStorage } from "./storage";

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
          message: `Unknown action type: ${action.type}`,
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

    const matchTopic = (text?: string) => {
      if (!topic) return true; // if no topic, match all
      const t = (text || "").toLowerCase();
      return t.includes(topic);
    };

    if (action.target === "all") {
      // Delete everything, optionally scoped by topic across each collection
      const notes = NotesStorage.load();
      const flashcards = FlashcardStorage.load();
      const schedule = ScheduleStorage.load();

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
      if (!topic) {
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
      if (!topic) {
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
      if (!topic) {
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
      const topic = action.data?.topic || "General";
      const note = {
        title: `Notes about ${topic}`,
        content: `# ${topic}\n\nStudy notes about ${topic}.`,
        source: "Generated",
        category: topic,
        tags: [topic.toLowerCase()],
      };

      const saved = NotesStorage.addBatch([note]);
      return {
        success: true,
        message: `Created notes about ${topic}.`,
        data: saved[0],
        count: 1,
      };
    }

    if (action.target === "flashcards") {
      const topic = action.data?.topic || "General";
      const count = action.data?.count || 5;

      const flashcards = [];
      for (let i = 1; i <= count; i++) {
        flashcards.push({
          question: `Question ${i} about ${topic}?`,
          answer: `Answer ${i} about ${topic}.`,
          category: topic,
        });
      }

      const saved = FlashcardStorage.addBatch(flashcards);
      return {
        success: true,
        message: `Created ${count} flashcards about ${topic}.`,
        data: saved,
        count: count,
      };
    }

    if (action.target === "schedule") {
      const task = action.data?.task || "Study Task";
      const scheduleItem = {
        title: task,
        date: new Date().toISOString().split("T")[0],
        time: "09:00",
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
          message: `No notes found${topic ? ` about "${topic}"` : ""} to convert.`,
        };
      }

      // Generate a few basic Q/A from the first relevant note content
      const chosen = relevant[0];
      const topicLabel = topic || chosen.category || "General";
      const lines = String(chosen.content || "")
        .split(/\n+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, 10);
      const cards = lines.slice(0, 5).map((line: string, i: number) => ({
        question: `Q${i + 1}: What about ${topicLabel}?`,
        answer: line,
        category: topicLabel,
      }));

      const saved = FlashcardStorage.addBatch(cards);
      return {
        success: true,
        message: `Converted notes${topic ? ` about "${topic}"` : ""} into ${saved.length} flashcards.`,
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

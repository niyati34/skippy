// Tool registry: pluggable capabilities the agent can execute
import { TaskExecutor } from "./taskExecutor";
import type { TaskAction, TaskRequest } from "./taskUnderstanding";

export type ToolContext = {
  // Extend as needed: memory, user prefs, time, lastResults, etc.
};

export type ToolResult = {
  success: boolean;
  message: string;
  data?: any;
  count?: number;
};

export interface Tool<Input = any> {
  id: string;
  description: string;
  // Optional: JSON schema/Zod for input validation (omitted for now for speed)
  permissions?: { destructive?: boolean; scopes?: string[] };
  execute(input: Input, ctx?: ToolContext): Promise<ToolResult>;
}

// Helper to call existing TaskExecutor for compatibility
async function execViaTaskExecutor(action: TaskAction): Promise<ToolResult> {
  const req: TaskRequest = {
    actions: [action],
    message: "tool-call",
    confidence: 1,
  };
  const [res] = await TaskExecutor.executeTask(req);
  return res;
}

export const tools: Record<string, Tool> = {
  "delete.notes": {
    id: "delete.notes",
    description: "Delete notes (optionally by topic or all)",
    permissions: { destructive: true, scopes: ["notes"] },
    async execute(input: { topic?: string }) {
      return execViaTaskExecutor({
        type: "delete",
        target: "notes",
        priority: "medium",
        data: { topic: input?.topic },
      });
    },
  },
  "delete.flashcards": {
    id: "delete.flashcards",
    description: "Delete flashcards (optionally by topic or all)",
    permissions: { destructive: true, scopes: ["flashcards"] },
    async execute(input: { topic?: string }) {
      return execViaTaskExecutor({
        type: "delete",
        target: "flashcards",
        priority: "medium",
        data: { topic: input?.topic },
      });
    },
  },
  "delete.schedule": {
    id: "delete.schedule",
    description: "Delete schedule items (optionally by topic or all)",
    permissions: { destructive: true, scopes: ["schedule"] },
    async execute(input: { topic?: string }) {
      return execViaTaskExecutor({
        type: "delete",
        target: "schedule",
        priority: "medium",
        data: { topic: input?.topic },
      });
    },
  },
  "delete.all": {
    id: "delete.all",
    description:
      "Delete everything across notes, flashcards, and schedule (or by topic)",
    permissions: { destructive: true, scopes: ["all"] },
    async execute(input: { topic?: string }) {
      return execViaTaskExecutor({
        type: "delete",
        target: "all",
        priority: "medium",
        data: { topic: input?.topic },
      });
    },
  },
  "create.notes": {
    id: "create.notes",
    description: "Create study notes about a topic",
    async execute(input: { topic: string }) {
      return execViaTaskExecutor({
        type: "create",
        target: "notes",
        priority: "medium",
        data: { topic: input?.topic },
      });
    },
  },
  "create.flashcards": {
    id: "create.flashcards",
    description: "Create flashcards about a topic",
    async execute(input: { topic: string; count?: number }) {
      return execViaTaskExecutor({
        type: "create",
        target: "flashcards",
        priority: "medium",
        data: { topic: input?.topic, count: input?.count },
      });
    },
  },
  "create.schedule": {
    id: "create.schedule",
    description: "Create a schedule item (task + date/time)",
    async execute(input: {
      task: string;
      date?: string;
      time?: string;
      dateTime?: Date;
    }) {
      return execViaTaskExecutor({
        type: "create",
        target: "schedule",
        priority: "medium",
        data: input,
      });
    },
  },
  "search.all": {
    id: "search.all",
    description: "Search all collections",
    async execute() {
      return execViaTaskExecutor({
        type: "search",
        target: "all",
        priority: "medium",
        data: {},
      });
    },
  },
  "search.notes": {
    id: "search.notes",
    description: "Search notes",
    async execute() {
      return execViaTaskExecutor({
        type: "search",
        target: "notes",
        priority: "medium",
        data: {},
      });
    },
  },
  "search.flashcards": {
    id: "search.flashcards",
    description: "Search flashcards",
    async execute() {
      return execViaTaskExecutor({
        type: "search",
        target: "flashcards",
        priority: "medium",
        data: {},
      });
    },
  },
  "search.schedule": {
    id: "search.schedule",
    description: "Search schedule",
    async execute() {
      return execViaTaskExecutor({
        type: "search",
        target: "schedule",
        priority: "medium",
        data: {},
      });
    },
  },
  "convert.notes_to_flashcards": {
    id: "convert.notes_to_flashcards",
    description: "Convert notes to flashcards (optionally by topic)",
    async execute(input: { topic?: string }) {
      return execViaTaskExecutor({
        type: "convert",
        target: "all",
        priority: "medium",
        data: { from: "notes", to: "flashcards", topic: input?.topic },
      });
    },
  },
};

export type ToolId = keyof typeof tools;

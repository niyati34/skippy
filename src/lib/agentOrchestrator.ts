// Agent Orchestrator - bridges understanding and execution
// Parses the user's input into actions, executes them, and returns a single cohesive response

import {
  TaskUnderstanding,
  TaskRequest,
  TaskAction,
} from "./taskUnderstanding";
import { TaskExecutor, TaskResult } from "./taskExecutor";

export interface OrchestratedResponse {
  success: boolean;
  message: string; // single user-facing summary line
  details: string[]; // per-action messages
  request: TaskRequest;
  results: TaskResult[];
}

export class AgentOrchestrator {
  // End-to-end entrypoint
  static async run(userInput: string): Promise<OrchestratedResponse> {
    // 1) Understand
    const understood = TaskUnderstanding.understandRequest(userInput);

    // 2) Execute in sequence
    const results = await TaskExecutor.executeTask(understood);

    // 3) Summarize into one cohesive line
    const message = this.summarize(understood.actions, results);
    const success = results.every((r) => r.success);
    const details = results.map((r) => r.message);

    return { success, message, details, request: understood, results };
  }

  // Create a compact, natural summary like:
  // "Created 10 flashcards about react and deleted 3 notes about physics."
  private static summarize(
    actions: TaskAction[],
    results: TaskResult[]
  ): string {
    if (actions.length === 0) return "No actionable request detected.";

    // Group by type+target for compact phrasing
    type Key = string;
    interface Aggregate {
      type: TaskAction["type"];
      target: TaskAction["target"];
      total: number;
      topics: Set<string>;
    }
    const aggregates = new Map<Key, Aggregate>();

    actions.forEach((a, idx) => {
      const key = `${a.type}:${a.target}`;
      const result = results[idx];
      const count = result?.count ?? 0;
      const topic = (a.data?.topic ||
        a.data?.task ||
        a.data?.from ||
        a.data?.to) as string | undefined;

      if (!aggregates.has(key)) {
        aggregates.set(key, {
          type: a.type,
          target: a.target,
          total: 0,
          topics: new Set<string>(),
        });
      }
      const ag = aggregates.get(key)!;
      ag.total += count;
      if (topic) ag.topics.add(String(topic));
    });

    const phrases: string[] = [];
    for (const ag of aggregates.values()) {
      const actionVerb = this.verbFor(ag.type);
      const targetNoun = this.nounFor(ag.target);
      const countPart = ag.total > 0 ? `${ag.total} ` : "";
      const topics = Array.from(ag.topics).filter(Boolean);
      const topicPart = topics.length
        ? ` ${
            topics.length === 1
              ? `about \"${topics[0]}\"`
              : `about ${topics.map((t) => `\"${t}\"`).join(", ")}`
          }`
        : "";
      phrases.push(
        `${actionVerb} ${countPart}${targetNoun}${topicPart}`.trim()
      );
    }

    if (phrases.length === 1) return this.capitalize(phrases[0]) + ".";
    const last = phrases.pop();
    return this.capitalize(`${phrases.join(", ")} and ${last}.`);
  }

  private static verbFor(type: TaskAction["type"]): string {
    switch (type) {
      case "create":
        return "created";
      case "delete":
        return "deleted";
      case "search":
        return "found";
      case "update":
        return "updated";
      case "convert":
        return "converted";
      case "analyze":
        return "analyzed";
      case "navigate":
        return "navigated to";
      default:
        return type;
    }
  }

  private static nounFor(target: TaskAction["target"]): string {
    switch (target) {
      case "flashcards":
        return "flashcards";
      case "notes":
        return "notes";
      case "schedule":
        return "schedule items";
      case "all":
        return "items";
      case "page":
        return "page";
      case "content":
        return "content";
      default:
        return String(target);
    }
  }

  private static capitalize(s: string): string {
    return s.length ? s[0].toUpperCase() + s.slice(1) : s;
  }
}

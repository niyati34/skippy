// Orchestrator - Bridges TaskUnderstanding and TaskExecutor
// Parses a user input into actions, executes them in sequence, and returns a cohesive summary

import { TaskUnderstanding, TaskRequest } from "./taskUnderstanding";
import { TaskExecutor, TaskResult } from "./taskExecutor";

export interface OrchestratedResponse {
  request: TaskRequest;
  results: TaskResult[];
  summary: string;
}

export class Orchestrator {
  async handle(userInput: string): Promise<OrchestratedResponse> {
    // 1) Understand the request
    const request = TaskUnderstanding.understandRequest(userInput);

    // 2) Execute actions in order
    const results = await TaskExecutor.executeTask(request);

    // 3) Build a single, cohesive response summary
    const parts: string[] = [];
    let createdNotes = 0;
    let createdCards = 0;
    let deletedNotes = 0;
    let deletedCards = 0;
    let deletedSchedule = 0;

    results.forEach((r) => {
      if (!r.success) {
        parts.push(r.message);
        return;
      }
      const msg = r.message.toLowerCase();
      if (/created .*notes/.test(msg)) createdNotes += r.count || 1;
      if (/created .*flashcards?/.test(msg)) createdCards += r.count || 0;
      if (/deleted .*notes/.test(msg)) deletedNotes += r.count || 0;
      if (/deleted .*flashcards?/.test(msg)) deletedCards += r.count || 0;
      if (/deleted .*schedule/.test(msg)) deletedSchedule += r.count || 0;
    });

    if (deletedNotes) parts.push(`deleted ${deletedNotes} notes`);
    if (deletedCards) parts.push(`deleted ${deletedCards} flashcards`);
    if (deletedSchedule) parts.push(`deleted ${deletedSchedule} schedule items`);
    if (createdCards) parts.push(`created ${createdCards} flashcards`);
    if (createdNotes) parts.push(`created ${createdNotes} notes`);

    const summary =
      parts.length > 0
        ? `Done: ${parts.join(", ")}.`
        : results.map((r) => r.message).join(" \n");

    return { request, results, summary };
  }
}

export const orchestrator = new Orchestrator();

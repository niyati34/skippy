// Minimal agent skeleton for future multi-agent orchestration
export type AgentMessage = { role: "system" | "user" | "assistant"; content: string };

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

export class BuddyAgent implements Agent {
  name = "Buddy";
  canHandle() {
    return true; // default router for now
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    return { summary: `Buddy received: ${input.text?.slice(0, 100) || ""}` };
  }
}

export class NotesAgent implements Agent {
  name = "Notes";
  canHandle(i: AgentTaskInput) {
    return /note|summar|study/i.test(i.intent || i.text || "");
  }
  async run(input: AgentTaskInput): Promise<AgentResult> {
    return { summary: "Notes agent stub; will generate structured notes." };
  }
}

export class PlannerAgent implements Agent {
  name = "Planner";
  canHandle(i: AgentTaskInput) {
    return /plan|schedule|timetable|exam|assignment/i.test(i.intent || i.text || "");
  }
  async run(): Promise<AgentResult> {
    return { summary: "Planner agent stub; will create schedule items." };
  }
}

export class FlashcardAgent implements Agent {
  name = "Flashcard";
  canHandle(i: AgentTaskInput) {
    return /flashcard|practice|quiz|revise/i.test(i.intent || i.text || "");
  }
  async run(): Promise<AgentResult> {
    return { summary: "Flashcard agent stub; will create practice cards." };
  }
}

export class Orchestrator {
  constructor(private agents: Agent[]) {}
  async handle(input: AgentTaskInput): Promise<AgentResult> {
    const a = this.agents.find((ag) => ag.canHandle(input)) || this.agents[0];
    return a.run(input);
  }
}

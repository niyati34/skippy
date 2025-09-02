// Action Executor - Routes actions to existing agents (no duplication)
// Uses your existing multi-agent system instead of recreating functionality

import type {
  StudyBuddyAction,
  StudyBuddyResponse,
} from "./intelligentPromptOrchestrator";

export interface ActionExecutionResult {
  action: string;
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  metadata?: any;
}

export interface ActionExecutionContext {
  uploadedFiles: File[];
  currentSubject?: string;
  studyMode?: string;
  userInput: string;
}

export class ActionExecutor {
  constructor() {
    // No storage initialization - we'll use existing agents
  }

  async executeActions(
    response: StudyBuddyResponse,
    context: ActionExecutionContext
  ): Promise<ActionExecutionResult[]> {
    console.log(
      "🚀 [Action Executor] Executing actions:",
      response.actions.length
    );

    const results: ActionExecutionResult[] = [];

    // Sort actions by priority (high -> medium -> low)
    const sortedActions = [...response.actions].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const action of sortedActions) {
      const startTime = Date.now();
      console.log(
        `⚡ [Action Executor] Executing ${action.action} (${action.priority} priority)`
      );

      try {
        const result = await this.executeSingleAction(action, context);
        const executionTime = Date.now() - startTime;

        results.push({
          action: action.action,
          success: true,
          output: result,
          executionTime,
          metadata: {
            priority: action.priority,
            estimatedTime: action.estimatedTime,
            actualTime: executionTime,
          },
        });

        console.log(
          `✅ [Action Executor] ${action.action} completed in ${executionTime}ms`
        );
      } catch (error) {
        const executionTime = Date.now() - startTime;
        console.error(`❌ [Action Executor] ${action.action} failed:`, error);

        results.push({
          action: action.action,
          success: false,
          error: error.message,
          executionTime,
          metadata: {
            priority: action.priority,
            estimatedTime: action.estimatedTime,
            actualTime: executionTime,
          },
        });
      }
    }

    return results;
  }

  private async executeSingleAction(
    action: StudyBuddyAction,
    context: ActionExecutionContext
  ): Promise<any> {
    // Import existing agents to avoid duplication
    const { NotesAgent, FlashcardAgent, PlannerAgent, BuddyAgent } =
      await import("@/lib/agent");
    const { FlashcardStorage } = await import("@/lib/storage");

    switch (action.action) {
      case "create_notes":
        // Use existing NotesAgent
        const notesAgent = new NotesAgent();
        const notesResult = await notesAgent.run({
          text: context.userInput,
          files: context.uploadedFiles.map((f) => ({
            name: f.name,
            type: f.type,
            content: "",
          })),
        });
        return {
          message: notesResult.summary,
          note: notesResult.artifacts?.notes?.[0],
        };

      case "create_flashcards":
        // Use existing FlashcardAgent
        const flashcardAgent = new FlashcardAgent();
        const flashcardResult = await flashcardAgent.run({
          text: context.userInput,
          files: context.uploadedFiles.map((f) => ({
            name: f.name,
            type: f.type,
            content: "",
          })),
        });
        return {
          message: flashcardResult.summary,
          flashcards: flashcardResult.artifacts?.flashcards?.[0],
        };

      case "delete_flashcards":
        // Use existing CommandAgent for deletion
        const { CommandAgent } = await import("@/lib/agent");
        const deleteAgent = new CommandAgent();
        const deleteResult = await deleteAgent.run({
          text: `delete flashcard ${
            action.data.topic || action.data.content || ""
          }`,
          files: context.uploadedFiles.map((f) => ({
            name: f.name,
            type: f.type,
            content: "",
          })),
        });
        return {
          message: deleteResult.summary,
          deleted: deleteResult.artifacts?.flashcards,
        };
      case "check_flashcards": {
        const all = FlashcardStorage.load();
        const norm = (s: string) => (s || "").toLowerCase();
        const topic = norm(action.data?.topic || "");
        const query = norm(action.data?.query || "");
        const filtered = all.filter((c) => {
          const hay = `${norm(c.question)} ${norm(c.answer)} ${norm(
            c.category
          )}`;
          const okTopic = topic ? hay.includes(topic) : true;
          const okQuery = query ? hay.includes(query) : true;
          return okTopic && okQuery;
        });
        const include = action.data?.includeSamples !== false;
        return {
          message: `Found ${filtered.length} flashcards${
            topic ? ` for topic '${action.data.topic}'` : ""
          }.`,
          total: all.length,
          count: filtered.length,
          samples: include
            ? filtered.slice(0, Math.min(5, filtered.length))
            : [],
        };
      }

      case "schedule_task":
      case "parse_timetable":
        // Use existing PlannerAgent
        const plannerAgent = new PlannerAgent();
        const plannerResult = await plannerAgent.run({
          text: context.userInput,
          files: context.uploadedFiles.map((f) => ({
            name: f.name,
            type: f.type,
            content: "",
          })),
        });
        return {
          message: plannerResult.summary,
          schedule: plannerResult.artifacts?.schedule?.[0],
          timetable: plannerResult.artifacts?.timetable?.[0],
        };

      case "plan_study_session":
        // Use existing BuddyAgent for study planning
        const buddyAgent = new BuddyAgent();
        const buddyResult = await buddyAgent.run({
          text: `Help me plan a study session: ${context.userInput}`,
          files: context.uploadedFiles.map((f) => ({
            name: f.name,
            type: f.type,
            content: "",
          })),
        });
        return {
          message: buddyResult.summary,
          plan: buddyResult.artifacts,
        };

      case "analyze_content":
        // Use existing NotesAgent for content analysis
        const analyzeAgent = new NotesAgent();
        const analyzeResult = await analyzeAgent.run({
          text: `Analyze this content: ${context.userInput}`,
          files: context.uploadedFiles.map((f) => ({
            name: f.name,
            type: f.type,
            content: "",
          })),
        });
        return {
          message: analyzeResult.summary,
          analysis: analyzeResult.artifacts,
        };

      default:
        // Fallback to BuddyAgent for unknown actions
        const fallbackAgent = new BuddyAgent();
        const fallbackResult = await fallbackAgent.run({
          text: context.userInput,
          files: context.uploadedFiles.map((f) => ({
            name: f.name,
            type: f.type,
            content: "",
          })),
        });
        return {
          message: fallbackResult.summary,
          result: fallbackResult.artifacts,
        };
    }
  }

  // All duplicate methods removed - now using existing agents
}

// Export a singleton instance
export const actionExecutor = new ActionExecutor();

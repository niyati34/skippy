// Intelligent Prompt Orchestrator - Natural Language Understanding for Study Buddy
// Replaces fixed keyword matching with intelligent AI-powered command understanding

export interface StudyBuddyAction {
  action: string;
  data: any;
  priority: "high" | "medium" | "low";
  requiresConfirmation?: boolean;
  estimatedTime?: number; // in minutes
}

export interface StudyBuddyResponse {
  actions: StudyBuddyAction[];
  message: string;
  confidence: number;
  followUpQuestions?: string[];
  context?: any;
}

export interface NaturalLanguageCommand {
  userInput: string;
  context?: {
    uploadedFiles?: File[];
    currentSubject?: string;
    studyMode?: string;
    recentActivity?: string;
  };
}

import { z } from "zod";
import { ToolSchemas, getToolboxDescriptions } from "@/lib/toolSchemas";

export class IntelligentPromptOrchestrator {
  private systemPrompt: string;
  private aiService: any;

  constructor() {
    this.systemPrompt = this.buildSystemPrompt();
    this.initializeAIService();
  }

  private buildSystemPrompt(): string {
    return `You are StudyBuddy, a tool-using AI assistant.
Return ONLY JSON with actions to execute. Do not include prose.

Toolbox you can use:
${getToolboxDescriptions()}

Rules:

Examples:

User: "Create notes on history and 5 flashcards of math"
Output:
{
  "actions": [
    {
      "action": "create_notes",
      "data": {"topic": "history", "type": "study_notes"},
      "priority": "high"
    },
    {
      "action": "create_flashcards", 
      "data": {"topic": "math", "count": 5},
      "priority": "high"
    }
  ],
  "message": "Creating history notes and 5 math flashcards!",
  "confidence": 0.95
}

User: "Delete react flashcards"
Output:
{
  "actions": [
    {
      "action": "delete_flashcards",
      "data": {"topic": "react"},
      "priority": "high"
    }
  ],
  "message": "Deleting React flashcards!",
  "confidence": 0.95
}

User: "how many flashcards do I have for react?"
Output:
{
  "actions": [
    {
      "action": "check_flashcards",
      "data": {"topic": "react", "includeSamples": true},
      "priority": "medium"
    }
  ],
  "message": "Checking how many React flashcards you have...",
  "confidence": 0.9
}
`;
  }

  private async initializeAIService() {
    try {
      // Use your existing OpenRouter service instead of non-existent multiModelAI
      const { callOpenRouter } = await import("@/services/openrouter");
      this.aiService = { reason: callOpenRouter };
    } catch (error) {
      console.error("Failed to initialize AI service:", error);
    }
  }

  async processNaturalLanguageCommand(
    command: NaturalLanguageCommand
  ): Promise<StudyBuddyResponse> {
    try {
      console.log(
        "🧠 [Intelligent Prompt] Processing natural language command:",
        command.userInput
      );

      if (!this.aiService) {
        await this.initializeAIService();
      }

      const fullPrompt = this.buildFullPrompt(command);
      console.log(
        "📝 [Intelligent Prompt] Sending to AI:",
        fullPrompt.substring(0, 200) + "..."
      );

      // Use OpenRouter for natural language understanding; fallback to Gemini
      let aiResponse = await this.aiService.reason([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: fullPrompt },
      ]);
      if (!aiResponse || typeof aiResponse !== "string") {
        try {
          const { callGemini } = await import("@/services/geminiAI");
          aiResponse = await callGemini(
            [
              { role: "system", content: this.systemPrompt },
              { role: "user", content: fullPrompt },
            ],
            { temperature: 0, responseMimeType: "application/json" }
          );
        } catch (e) {
          console.warn("Gemini fallback failed:", e);
        }
      }

      console.log("🤖 [Intelligent Prompt] AI Response:", aiResponse);

      // Parse the AI response
      const parsedResponse = this.parseAIResponse(aiResponse);
      // Post-validate each action against schemas and enforce safety
      parsedResponse.actions = parsedResponse.actions.map((a) => {
        const schema = ToolSchemas[a.action as keyof typeof ToolSchemas];
        if (schema) {
          const res = (schema as z.ZodTypeAny).safeParse(a.data || {});
          if (!res.success) {
            parsedResponse.followUpQuestions =
              parsedResponse.followUpQuestions || [];
            parsedResponse.followUpQuestions.push(
              `Missing/invalid data for ${a.action}: ${res.error.issues
                .map((i) => i.path.join("."))
                .join(", ")}`
            );
            a.requiresConfirmation = true;
          } else {
            a.data = res.data;
          }
        }
        if (
          a.action.startsWith("delete") &&
          (parsedResponse.confidence ?? 0) < 0.85
        ) {
          a.requiresConfirmation = true;
        }
        return a;
      });

      console.log("✅ [Intelligent Prompt] Parsed response:", parsedResponse);

      return parsedResponse;
    } catch (error) {
      console.error("❌ [Intelligent Prompt] Error processing command:", error);
      return this.generateFallbackResponse(command.userInput);
    }
  }

  private buildFullPrompt(command: NaturalLanguageCommand): string {
    const context = command.context || {};

    return `${this.systemPrompt}

CURRENT REQUEST:
User Input: "${command.userInput}"
Uploaded Files: ${
      context.uploadedFiles?.map((f) => f.name).join(", ") || "None"
    }
Current Subject: ${context.currentSubject || "Not specified"}
Study Mode: ${context.studyMode || "General"}
Recent Activity: ${context.recentActivity || "None"}

Please analyze this request and return the appropriate JSON response with actions.`;
  }

  private parseAIResponse(aiResponse: string): StudyBuddyResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate the response structure
        if (parsed.actions && Array.isArray(parsed.actions)) {
          return {
            actions: parsed.actions.map((action: any) => ({
              action: action.action || "unknown",
              data: action.data || {},
              priority: action.priority || "medium",
              requiresConfirmation: action.requiresConfirmation || false,
              estimatedTime: action.estimatedTime || 5,
            })),
            message: parsed.message || "Task completed successfully",
            confidence: parsed.confidence || 0.8,
            followUpQuestions: parsed.followUpQuestions || [],
            context: parsed.context || {},
          };
        }
      }

      // If JSON parsing fails, try to extract actions from text
      return this.extractActionsFromText(aiResponse);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return this.extractActionsFromText(aiResponse);
    }
  }

  private extractActionsFromText(text: string): StudyBuddyResponse {
    // Simple fallback: just return empty actions to trigger fallback to existing agents
    console.log(
      "🔄 [Intelligent Prompt] Using fallback - no actions extracted"
    );
    return {
      actions: [],
      message: "I need to use the fallback system.",
      confidence: 0.0,
      followUpQuestions: [],
    };
  }

  private generateFallbackResponse(userInput: string): StudyBuddyResponse {
    return {
      actions: [
        {
          action: "analyze_content",
          data: { action: "general_analysis", input: userInput },
          priority: "medium",
          estimatedTime: 5,
        },
      ],
      message: "I'm processing your request. Let me analyze what you need.",
      confidence: 0.5,
      followUpQuestions: [
        "Could you rephrase your request or provide more context?",
      ],
    };
  }

  // Helper method to get action descriptions for UI
  getActionDescription(action: string): string {
    const descriptions: Record<string, string> = {
      create_notes: "Creating study notes",
      update_notes: "Updating existing notes",
      search_notes: "Searching through notes",
      summarize_notes: "Creating summaries",
      create_flashcards: "Generating flashcards",
      check_flashcards: "Checking flashcard counts",
      schedule_task: "Scheduling task/reminder",
      parse_timetable: "Parsing timetable",
      plan_study_session: "Planning study session",
      analyze_content: "Analyzing content",
      set_reminder: "Setting reminder",
      track_progress: "Tracking progress",
    };

    return descriptions[action] || "Processing request";
  }

  // Helper method to get action icons for UI
  getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      create_notes: "📝",
      update_notes: "✏️",
      search_notes: "🔍",
      summarize_notes: "📋",
      create_flashcards: "🃏",
      check_flashcards: "🔢",
      schedule_task: "📅",
      parse_timetable: "⏰",
      plan_study_session: "📚",
      analyze_content: "🔬",
      set_reminder: "⏰",
      track_progress: "📊",
    };

    return icons[action] || "🤖";
  }
}

// Export a singleton instance
export const intelligentPromptOrchestrator =
  new IntelligentPromptOrchestrator();

// Agentic Decision Brain - Makes your AI think and decide like a real study buddy
// Analyzes context, predicts user needs, and proactively suggests actions

import { agenticMemory } from "./agenticMemory";
import { TaskUnderstanding, TaskAction } from "./taskUnderstanding";
import { TaskExecutor } from "./taskExecutor";

export interface DecisionContext {
  userInput: string;
  conversationHistory: string;
  currentTime: Date;
  userProfile: any;
  recentTasks: TaskAction[];
  environmentContext: {
    timeOfDay: "morning" | "afternoon" | "evening" | "night";
    dayOfWeek: string;
    isWeekend: boolean;
  };
}

export interface AgenticDecision {
  primaryAction: TaskAction[];
  reasoning: string;
  confidence: number;
  proactiveSuggestions: string[];
  emotionalResponse: string;
  followUpQuestions: string[];
}

export class AgenticBrain {
  // Main decision-making method
  async makeDecision(userInput: string): Promise<AgenticDecision> {
    console.log(`🧠 [AgenticBrain] Processing: "${userInput}"`);

    const context = this.buildDecisionContext(userInput);
    const parsedIntent = await TaskUnderstanding.understandRequest(userInput);

    // Analyze the situation with AI-like reasoning
    const reasoning = this.generateReasoning(context, parsedIntent);
    const confidence = this.calculateConfidence(context, parsedIntent);

    // Generate proactive suggestions
    const proactiveSuggestions = this.generateProactiveSuggestions(context);

    // Create emotional response
    const emotionalResponse = this.generateEmotionalResponse(
      context,
      userInput
    );

    // Generate follow-up questions
    const followUpQuestions = this.generateFollowUpQuestions(
      context,
      parsedIntent
    );

    // Remember this decision
    agenticMemory.rememberInteraction(
      userInput,
      reasoning,
      parsedIntent.actions[0]?.type,
      "success"
    );

    return {
      primaryAction: parsedIntent.actions,
      reasoning,
      confidence,
      proactiveSuggestions,
      emotionalResponse,
      followUpQuestions,
    };
  }

  // Generate human-like reasoning
  private generateReasoning(context: DecisionContext, intent: any): string {
    let reasoning = "";

    // Time-aware reasoning
    if (context.environmentContext.timeOfDay === "morning") {
      reasoning +=
        "Since it's morning, you're probably fresh and ready to tackle challenging tasks. ";
    } else if (context.environmentContext.timeOfDay === "evening") {
      reasoning +=
        "It's evening, so you might want to review what you learned today or prepare for tomorrow. ";
    }

    // Task-specific reasoning
    if (
      intent.actions.some(
        (a: TaskAction) => a.type === "create" && a.target === "flashcards"
      )
    ) {
      reasoning +=
        "Creating flashcards is a great way to reinforce learning through active recall. ";
    }

    if (intent.actions.some((a: TaskAction) => a.type === "delete")) {
      reasoning +=
        "Cleaning up your study materials helps maintain focus and organization. ";
    }

    // Pattern recognition
    const memoryContext = agenticMemory.getRelevantContext(context.userInput);
    if (memoryContext.includes("struggling")) {
      reasoning +=
        "I notice you've been working hard on this topic. Let me help break it down into manageable pieces. ";
    }

    return (
      reasoning || "I understand what you need. Let me help you with that."
    );
  }

  // Calculate decision confidence
  private calculateConfidence(context: DecisionContext, intent: any): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for clear, specific requests
    if (intent.confidence > 0.8) confidence += 0.15;

    // Higher confidence if we've handled similar requests before
    const similarMemories = agenticMemory.getRelevantContext(context.userInput);
    if (similarMemories.length > 0) confidence += 0.1;

    // Lower confidence for vague requests
    if (context.userInput.length < 10) confidence -= 0.2;

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  // Generate proactive suggestions
  private generateProactiveSuggestions(context: DecisionContext): string[] {
    const suggestions: string[] = [];
    const { timeOfDay, isWeekend } = context.environmentContext;

    // Time-based suggestions
    if (timeOfDay === "morning" && !isWeekend) {
      suggestions.push("Want to review your schedule for today?");
      suggestions.push(
        "How about creating some flashcards for your morning study session?"
      );
    }

    if (timeOfDay === "evening") {
      suggestions.push("Ready to review what you learned today?");
      suggestions.push("Want to prepare notes for tomorrow's classes?");
    }

    // Pattern-based suggestions
    if (context.userInput.includes("exam")) {
      suggestions.push("Should I help you create a study plan for your exam?");
      suggestions.push("Want to make practice flashcards for this subject?");
    }

    if (
      context.userInput.includes("difficult") ||
      context.userInput.includes("hard")
    ) {
      suggestions.push(
        "Would you like me to break this topic into smaller, easier parts?"
      );
      suggestions.push(
        "How about I create some simple practice questions to help you understand?"
      );
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  // Generate emotional response
  private generateEmotionalResponse(
    context: DecisionContext,
    userInput: string
  ): string {
    // Detect emotional state from input
    if (/frustrated|difficult|hard|stuck/i.test(userInput)) {
      return "I can sense this is challenging for you. Don't worry - we'll tackle this together step by step! 💪";
    }

    if (/excited|love|great|awesome/i.test(userInput)) {
      return "I love your enthusiasm! Let's channel that energy into some productive learning! 🎉";
    }

    if (/tired|exhausted|sleepy/i.test(userInput)) {
      return "You sound tired. How about we do something light and engaging? Rest is important for learning too! 😴";
    }

    if (/exam|test|quiz/i.test(userInput)) {
      return "Exam time can be stressful, but you've got this! I'm here to help you prepare effectively. 📚";
    }

    return "I'm here to support your learning journey. Let's make studying enjoyable and effective! 🌟";
  }

  // Generate follow-up questions
  private generateFollowUpQuestions(
    context: DecisionContext,
    intent: any
  ): string[] {
    const questions: string[] = [];

    // Task-specific follow-ups
    if (
      intent.actions.some(
        (a: TaskAction) => a.type === "create" && a.target === "flashcards"
      )
    ) {
      questions.push(
        "What difficulty level would you prefer for these flashcards?"
      );
      questions.push("Any specific areas you want me to focus on?");
    }

    if (
      intent.actions.some(
        (a: TaskAction) => a.type === "create" && a.target === "notes"
      )
    ) {
      questions.push("Would you like me to include diagrams or examples?");
      questions.push("How detailed should these notes be?");
    }

    // Context-based follow-ups
    if (context.userInput.includes("exam")) {
      questions.push("When is your exam?");
      questions.push("What topics are you most worried about?");
    }

    if (
      context.userInput.includes("homework") ||
      context.userInput.includes("assignment")
    ) {
      questions.push("When is this due?");
      questions.push("Do you need help breaking this into smaller tasks?");
    }

    return questions.slice(0, 2); // Limit to 2 questions
  }

  // Build comprehensive decision context
  private buildDecisionContext(userInput: string): DecisionContext {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

    let timeOfDay: "morning" | "afternoon" | "evening" | "night";
    if (hour < 12) timeOfDay = "morning";
    else if (hour < 17) timeOfDay = "afternoon";
    else if (hour < 21) timeOfDay = "evening";
    else timeOfDay = "night";

    return {
      userInput,
      conversationHistory: agenticMemory.getRelevantContext(userInput),
      currentTime: now,
      userProfile: {}, // Will be populated by agenticMemory
      recentTasks: [], // Can be populated from task history
      environmentContext: {
        timeOfDay,
        dayOfWeek,
        isWeekend: [0, 6].includes(now.getDay()),
      },
    };
  }

  // Predict what user might need next
  predictNextAction(currentActions: TaskAction[]): string[] {
    const predictions: string[] = [];

    for (const action of currentActions) {
      if (action.type === "create" && action.target === "flashcards") {
        predictions.push("You might want to practice with these flashcards");
        predictions.push(
          "Consider creating a study schedule for regular practice"
        );
      }

      if (action.type === "create" && action.target === "notes") {
        predictions.push("You could create flashcards from these notes");
        predictions.push("How about summarizing key points?");
      }

      if (action.type === "delete") {
        predictions.push("Want to create new, updated materials?");
        predictions.push("Ready to start fresh with new content?");
      }
    }

    return predictions.slice(0, 3);
  }

  // Learn from user feedback
  learnFromFeedback(userFeedback: string, lastDecision: AgenticDecision) {
    let feedbackType: "positive" | "negative" | "neutral" = "neutral";

    if (/good|great|perfect|exactly|yes|thanks/i.test(userFeedback)) {
      feedbackType = "positive";
    } else if (/no|wrong|not what|different/i.test(userFeedback)) {
      feedbackType = "negative";
    }

    // Store learning for future decisions
    agenticMemory.rememberInteraction(
      `Feedback: ${userFeedback}`,
      `Decision was ${feedbackType}`,
      "feedback",
      feedbackType === "positive" ? "success" : "failure"
    );

    console.log(`🧠 [AgenticBrain] Learned from feedback: ${feedbackType}`);
  }
}

export const agenticBrain = new AgenticBrain();

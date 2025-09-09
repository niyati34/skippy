// Advanced Agentic Memory System - Makes your AI truly remember everything
// Creates persistent, contextual memory that grows with each interaction

export interface MemoryEntry {
  id: string;
  timestamp: Date;
  type: "conversation" | "task" | "preference" | "context" | "achievement";
  content: string;
  metadata: {
    userInput?: string;
    taskType?: string;
    outcome?: "success" | "failure" | "partial";
    emotionalContext?: "frustrated" | "excited" | "confused" | "satisfied";
    difficulty?: "easy" | "medium" | "hard";
    tags?: string[];
  };
  relatedMemories?: string[]; // IDs of related memories
  importance: number; // 1-10 scale
}

export interface UserProfile {
  name: string;
  studyPreferences: {
    preferredLearningStyle: "visual" | "auditory" | "kinesthetic" | "mixed";
    preferredDifficulty: "beginner" | "intermediate" | "advanced";
    studyHours: string; // e.g., "morning", "evening", "flexible"
    subjects: string[];
    goals: string[];
  };
  personality: {
    formalityLevel: "formal" | "casual" | "friendly";
    motivationStyle: "encouraging" | "challenging" | "gentle";
    humorLevel: "none" | "light" | "frequent";
  };
  currentContext: {
    activeSubjects: string[];
    upcomingExams: Array<{ subject: string; date: string }>;
    strugglingWith: string[];
    recentAchievements: string[];
  };
}

export class AgenticMemory {
  private memories: MemoryEntry[] = [];
  private userProfile: UserProfile;
  private conversationHistory: Array<{
    user: string;
    ai: string;
    timestamp: Date;
  }> = [];

  constructor() {
    this.loadMemories();
    this.userProfile = this.loadUserProfile();
  }

  // Remember everything the user does and says
  rememberInteraction(
    userInput: string,
    aiResponse: string,
    taskType?: string,
    outcome?: string
  ) {
    const memory: MemoryEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      type: "conversation",
      content: `User: ${userInput}\nAI: ${aiResponse}`,
      metadata: {
        userInput,
        taskType,
        outcome: outcome as any,
        emotionalContext: this.detectEmotionalContext(userInput),
        tags: this.extractTags(userInput),
      },
      importance: this.calculateImportance(userInput, outcome),
    };

    this.memories.push(memory);
    this.conversationHistory.push({
      user: userInput,
      ai: aiResponse,
      timestamp: new Date(),
    });

    this.saveMemories();
    this.updateUserProfile(userInput, taskType);
  }

  // Get relevant context for current conversation
  getRelevantContext(userInput: string): string {
    const relevantMemories = this.findRelevantMemories(userInput);
    const recentContext = this.conversationHistory.slice(-3); // Last 3 exchanges

    let context = `User Profile: ${this.userProfile.name}\n`;
    context += `Learning Style: ${this.userProfile.studyPreferences.preferredLearningStyle}\n`;
    context += `Current Subjects: ${this.userProfile.currentContext.activeSubjects.join(
      ", "
    )}\n\n`;

    if (recentContext.length > 0) {
      context += "Recent Conversation:\n";
      recentContext.forEach((conv) => {
        context += `- User: ${conv.user}\n- AI: ${conv.ai}\n`;
      });
      context += "\n";
    }

    if (relevantMemories.length > 0) {
      context += "Relevant Past Interactions:\n";
      relevantMemories.slice(0, 3).forEach((memory) => {
        context += `- ${memory.content.substring(0, 100)}...\n`;
      });
    }

    return context;
  }

  // Detect user's emotional state from their input
  private detectEmotionalContext(
    input: string
  ): "frustrated" | "excited" | "confused" | "satisfied" {
    const frustrated =
      /difficult|hard|don't understand|confused|stuck|frustrated|help/i;
    const excited = /great|awesome|love|excited|amazing|perfect|excellent/i;
    const confused = /what|how|why|don't get|unclear|explain/i;

    if (frustrated.test(input)) return "frustrated";
    if (excited.test(input)) return "excited";
    if (confused.test(input)) return "confused";
    return "satisfied";
  }

  // Generate personality-aware responses
  generatePersonalityResponse(baseResponse: string): string {
    const { personality, currentContext } = this.userProfile;
    let enhancedResponse = baseResponse;

    // Add personality touches
    if (personality.formalityLevel === "friendly") {
      enhancedResponse = this.addFriendlyTone(enhancedResponse);
    }

    if (personality.motivationStyle === "encouraging") {
      enhancedResponse = this.addEncouragement(enhancedResponse);
    }

    // Add contextual awareness
    if (currentContext.strugglingWith.length > 0) {
      enhancedResponse += `\n\n💡 Remember, I noticed you've been working on ${currentContext.strugglingWith.join(
        " and "
      )}. Keep going, you're making progress!`;
    }

    return enhancedResponse;
  }

  private addFriendlyTone(response: string): string {
    const friendlyStarters = [
      "Hey there! ",
      "Alright, ",
      "Sure thing! ",
      "Absolutely! ",
    ];
    const randomStarter =
      friendlyStarters[Math.floor(Math.random() * friendlyStarters.length)];
    return randomStarter + response;
  }

  private addEncouragement(response: string): string {
    const encouragements = [
      "You're doing great! ",
      "Keep up the excellent work! ",
      "I believe in you! ",
      "You've got this! ",
    ];
    const randomEncouragement =
      encouragements[Math.floor(Math.random() * encouragements.length)];
    return response + "\n\n" + randomEncouragement;
  }

  private findRelevantMemories(input: string): MemoryEntry[] {
    const inputWords = input.toLowerCase().split(" ");
    return this.memories
      .filter((memory) => {
        const memoryWords = memory.content.toLowerCase().split(" ");
        const commonWords = inputWords.filter((word) =>
          memoryWords.includes(word)
        );
        return commonWords.length > 0;
      })
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
  }

  private calculateImportance(input: string, outcome?: string): number {
    let importance = 5; // Base importance

    // Higher importance for task completions
    if (outcome === "success") importance += 2;
    if (outcome === "failure") importance += 3; // Remember failures to avoid them

    // Higher importance for questions and learning
    if (input.includes("?")) importance += 1;
    if (/learn|study|understand|explain/i.test(input)) importance += 2;

    return Math.min(importance, 10);
  }

  private extractTags(input: string): string[] {
    const tags: string[] = [];

    // Subject tags
    const subjects = [
      "math",
      "physics",
      "chemistry",
      "biology",
      "history",
      "english",
      "computer science",
      "programming",
    ];
    subjects.forEach((subject) => {
      if (input.toLowerCase().includes(subject)) tags.push(subject);
    });

    // Task type tags
    if (/flashcard/i.test(input)) tags.push("flashcards");
    if (/note/i.test(input)) tags.push("notes");
    if (/schedule|exam|assignment/i.test(input)) tags.push("schedule");

    return tags;
  }

  private updateUserProfile(userInput: string, taskType?: string) {
    // Learn about user preferences from their interactions
    if (taskType === "create" && /flashcard/i.test(userInput)) {
      if (!this.userProfile.studyPreferences.subjects.includes("flashcards")) {
        this.userProfile.studyPreferences.subjects.push("flashcards");
      }
    }

    // Update struggling subjects
    if (/difficult|hard|don't understand/i.test(userInput)) {
      const subjects = this.extractTags(userInput);
      subjects.forEach((subject) => {
        if (!this.userProfile.currentContext.strugglingWith.includes(subject)) {
          this.userProfile.currentContext.strugglingWith.push(subject);
        }
      });
    }

    this.saveUserProfile();
  }

  private loadMemories(): void {
    try {
      const stored = localStorage.getItem("agentic-memories");
      if (stored) {
        this.memories = JSON.parse(stored).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    } catch (error) {
      console.warn("Could not load memories:", error);
    }
  }

  private saveMemories(): void {
    try {
      localStorage.setItem("agentic-memories", JSON.stringify(this.memories));
    } catch (error) {
      console.warn("Could not save memories:", error);
    }
  }

  private loadUserProfile(): UserProfile {
    try {
      const stored = localStorage.getItem("user-profile");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Could not load user profile:", error);
    }

    // Default profile
    return {
      name: "Friend",
      studyPreferences: {
        preferredLearningStyle: "mixed",
        preferredDifficulty: "intermediate",
        studyHours: "flexible",
        subjects: [],
        goals: [],
      },
      personality: {
        formalityLevel: "friendly",
        motivationStyle: "encouraging",
        humorLevel: "light",
      },
      currentContext: {
        activeSubjects: [],
        upcomingExams: [],
        strugglingWith: [],
        recentAchievements: [],
      },
    };
  }

  private saveUserProfile(): void {
    try {
      localStorage.setItem("user-profile", JSON.stringify(this.userProfile));
    } catch (error) {
      console.warn("Could not save user profile:", error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const agenticMemory = new AgenticMemory();

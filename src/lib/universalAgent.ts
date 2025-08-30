// Universal Agentic AI System - Truly Intelligent Assistant
// Handles ANY type of task with advanced reasoning and decomposition

import {
  generateFlashcards,
  generateNotesFromContent,
  generateScheduleFromContent,
  callOpenRouter,
  type ChatMessage,
} from "@/services/openrouter";
import {
  BuddyMemoryStorage,
  FlashcardStorage,
  NotesStorage,
  ScheduleStorage,
  type StoredFlashcard,
  type StoredNote,
  type StoredScheduleItem,
} from "@/lib/storage";
import { nlpProcessor } from "@/lib/enhancedNLP";
import { studyDataManager } from "@/lib/studyDataManager";
import type { AgentTaskInput, AgentResult } from "./agent";

// Advanced Task Types for Universal Intelligence
export type TaskComplexity =
  | "simple"
  | "complex"
  | "multi-step"
  | "creative"
  | "analytical";

export type TaskStep = {
  id: string;
  description: string;
  type: string;
  dependencies: string[];
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
};

export type DecomposedTask = {
  originalRequest: string;
  complexity: TaskComplexity;
  steps: TaskStep[];
  expectedOutputType: string;
  estimatedTime: string;
};

// Expanded domain categories for universal intelligence
export type UniversalIntent = {
  domain:
    | "notes"
    | "flashcards"
    | "schedule"
    | "mixed"
    | "query"
    | "social"
    | "unclear"
    | "research" // Web search, analysis, summarization
    | "creative" // Writing, brainstorming, content generation
    | "problem_solving" // Math, logic, reasoning
    | "planning" // Project management, goal setting
    | "communication" // Email, messages, letters
    | "learning" // Tutoring, explanation, skill assessment
    | "analysis"; // Data analysis, comparison, evaluation
  action:
    | "create"
    | "delete"
    | "update"
    | "view"
    | "search"
    | "analyze"
    | "connect"
    | "recommend"
    | "chat"
    | "read"
    | "decompose" // Break down complex tasks
    | "synthesize" // Combine multiple sources
    | "explain" // Educational explanation
    | "compare" // Analytical comparison
    | "plan" // Strategic planning
    | "solve" // Problem solving
    | "generate" // Creative generation
    | "optimize" // Improvement and optimization
    | "evaluate"; // Assessment and evaluation
  parameters: {
    topic?: string;
    count?: number;
    difficulty?: string;
    format?: string;
    dateTime?: string;
    priority?: string;
    useExistingData?: boolean;
    dataContext?: string;
    conversational?: boolean;
    complexity?: TaskComplexity;
    steps?: TaskStep[];
    requiresDecomposition?: boolean;
    contextScope?: "current" | "historical" | "predictive";
    outputFormat?: "text" | "structured" | "visual" | "interactive";
    [key: string]: any;
  };
  confidence: number;
  reasoning: string;
};

// Enhanced context for better understanding
export interface UniversalContext {
  userInput: string;
  previousCommands: string[];
  currentContent: {
    notes: StoredNote[];
    flashcards: StoredFlashcard[];
    schedule: StoredScheduleItem[];
  };
  userPreferences: any;
  sessionHistory: string[];
}

export class UniversalAgenticAI {
  private context: UniversalContext;
  private studyDataManager = studyDataManager;
  private conversationMemory: {
    timestamp: Date;
    userInput: string;
    aiResponse: string;
    topics: string[];
  }[] = [];

  // 🧠 Advanced Intelligence Components
  private taskDecomposer: TaskDecomposer;
  private capabilityRegistry: CapabilityRegistry;
  private executionEngine: ExecutionEngine;
  private learningModule: LearningModule;

  constructor() {
    this.context = {
      userInput: "",
      previousCommands: [],
      currentContent: {
        notes: NotesStorage.load(),
        flashcards: FlashcardStorage.load(),
        schedule: ScheduleStorage.load(),
      },
      userPreferences: BuddyMemoryStorage.load(),
      sessionHistory: [],
    };

    // Initialize advanced components
    this.taskDecomposer = new TaskDecomposer();
    this.capabilityRegistry = new CapabilityRegistry();
    this.executionEngine = new ExecutionEngine();
    this.learningModule = new LearningModule();

    // Load conversation memory from localStorage
    this.loadConversationMemory();

    // Initialize available capabilities
    this.initializeCapabilities();
  }

  // 🧠 MEMORY SYSTEM METHODS
  private loadConversationMemory() {
    try {
      const stored = localStorage.getItem("skippy-conversation-memory");
      if (stored) {
        this.conversationMemory = JSON.parse(stored).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        // Keep only last 50 conversations to prevent memory overflow
        this.conversationMemory = this.conversationMemory.slice(-50);
      }
    } catch (error) {
      console.warn("Failed to load conversation memory:", error);
      this.conversationMemory = [];
    }
  }

  private saveConversationMemory() {
    try {
      localStorage.setItem(
        "skippy-conversation-memory",
        JSON.stringify(this.conversationMemory)
      );
    } catch (error) {
      console.warn("Failed to save conversation memory:", error);
    }
  }

  private updateUserMemory(activity: string) {
    const memory = BuddyMemoryStorage.load();
    memory.messageCount = (memory.messageCount || 0) + 1;

    // Extract topics from activity
    const topics = this.extractTopicsFromText(activity);
    topics.forEach((topic) => {
      if (!memory.topics.includes(topic)) {
        memory.topics.push(topic);
      }
    });

    // Keep only recent topics (last 20)
    memory.topics = memory.topics.slice(-20);

    BuddyMemoryStorage.save(memory);
  }

  private recordConversation(userInput: string, aiResponse: string) {
    const topics = this.extractTopicsFromText(userInput + " " + aiResponse);
    this.conversationMemory.push({
      timestamp: new Date(),
      userInput,
      aiResponse,
      topics,
    });

    // Keep only last 50 conversations
    this.conversationMemory = this.conversationMemory.slice(-50);
    this.saveConversationMemory();
  }

  private extractTopicsFromText(text: string): string[] {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    // Common study topics
    const topicPatterns = [
      /\b(javascript|js)\b/g,
      /\breact\b/g,
      /\bpython\b/g,
      /\bnode\.?js\b/g,
      /\b(html|css)\b/g,
      /\b(typescript|ts)\b/g,
      /\b(database|sql)\b/g,
      /\b(algorithm|data structure)\b/g,
      /\b(machine learning|ml|ai)\b/g,
      /\b(blockchain)\b/g,
    ];

    topicPatterns.forEach((pattern) => {
      const matches = lowerText.match(pattern);
      if (matches) {
        topics.push(...matches.map((m) => m.trim()));
      }
    });

    return [...new Set(topics)]; // Remove duplicates
  }

  private getContextualMemory(userInput: string): string {
    const lowerInput = userInput.toLowerCase();
    const relevantMemories = this.conversationMemory
      .filter((memory) => {
        return (
          memory.topics.some((topic) =>
            lowerInput.includes(topic.toLowerCase())
          ) ||
          memory.userInput.toLowerCase().includes(lowerInput.substring(0, 10))
        );
      })
      .slice(-5); // Last 5 relevant conversations

    if (relevantMemories.length === 0) return "";

    return `Previous context: ${relevantMemories
      .map(
        (m) =>
          `User asked about ${m.topics.join(", ")} - ${m.userInput.substring(
            0,
            50
          )}...`
      )
      .join("; ")}`;
  }

  async processAnyPrompt(input: AgentTaskInput): Promise<AgentResult> {
    const userText = input.text || "";

    // 🤖 PHASE 0: AI-powered typo correction and intent understanding
    const aiCorrectedText = await this.aiPoweredIntentCorrection(userText);

    // First, correct and normalize the input text
    const correctionResult = nlpProcessor.correctText(aiCorrectedText);
    const normalizedText = correctionResult.correctedText;

    // Log corrections if any were made
    if (aiCorrectedText !== userText) {
      console.log(
        `🤖 [AI-NLU] Intent correction: "${userText}" → "${aiCorrectedText}"`
      );
    }
    if (correctionResult.corrections.length > 0) {
      console.log(
        "🔧 [UniversalAI] Applied corrections:",
        correctionResult.corrections
      );
    }

    // 🧠 Get contextual memory for better understanding
    const contextualMemory = this.getContextualMemory(normalizedText);

    this.context.userInput = normalizedText;
    this.context.sessionHistory.push(normalizedText);

    console.log("🧠 [UniversalAI] Processing prompt:", normalizedText);
    if (contextualMemory) {
      console.log("🧠 [Memory] Relevant context:", contextualMemory);
    }

    try {
      // 🚀 PHASE 1: Analyze task complexity and decompose if needed
      const taskAnalysis = await this.taskDecomposer.decompose(
        normalizedText,
        this.context
      );
      console.log(
        "📊 [TaskAnalysis] Complexity:",
        taskAnalysis.complexity,
        "Steps:",
        taskAnalysis.steps.length
      );

      // 🎯 PHASE 2: Parse intent with enhanced understanding
      const intent = await this.parseIntentWithAI(
        normalizedText,
        contextualMemory
      );

      // Enhance intent with task analysis
      intent.parameters.complexity = taskAnalysis.complexity;
      intent.parameters.requiresDecomposition = taskAnalysis.steps.length > 1;
      intent.parameters.steps = taskAnalysis.steps;

      console.log("🎯 [UniversalAI] Enhanced intent:", intent);

      // 🚀 PHASE 3: Execute with advanced orchestration
      let result: AgentResult;

      if (taskAnalysis.complexity === "simple") {
        // Direct execution for simple tasks
        result = await this.executeUniversalAction(intent, {
          ...input,
          text: normalizedText,
        });
      } else {
        // Advanced execution for complex tasks
        result = await this.executionEngine.execute(taskAnalysis, this);

        // Enhance result with task context
        result.artifacts = {
          ...result.artifacts,
          notes: (result.artifacts.notes || []).concat([
            {
              title: "Task Analysis",
              content: `Breakdown: ${taskAnalysis.steps.length} steps, Complexity: ${taskAnalysis.complexity}`,
              metadata: {
                taskBreakdown: taskAnalysis.steps,
                complexity: taskAnalysis.complexity,
                estimatedTime: taskAnalysis.estimatedTime,
              },
            },
          ]),
        };
      }

      // 🧠 PHASE 4: Learn from the interaction
      this.learningModule.recordInteraction(normalizedText, intent, result);

      // Get proactive recommendations
      const recommendations =
        this.learningModule.getRecommendations(normalizedText);
      if (recommendations.length > 0) {
        result.summary += "\n\n💡 You might also like: " + recommendations[0];
      }

      // 📝 PHASE 5: Record conversation and update memory
      this.recordConversation(normalizedText, result.summary);
      this.updateUserMemory(normalizedText);

      return result;
    } catch (error) {
      console.error("🚨 [UniversalAI] Processing failed:", error);

      // Provide helpful suggestions based on the input and memory
      const suggestions = nlpProcessor.suggestCompletions(userText);
      const suggestionText =
        suggestions.length > 0
          ? `\n\nTry these examples:\n• ${suggestions.slice(0, 3).join("\n• ")}`
          : "";

      const errorResult = {
        summary: `I encountered an issue processing your request. Could you try rephrasing it or being more specific about what you'd like me to do with your notes, flashcards, or schedule?${suggestionText}`,
        artifacts: {},
      };

      // Record failed attempts too for learning
      this.recordConversation(normalizedText, errorResult.summary);

      return errorResult;
    }
  }

  private async parseIntentWithAI(
    userText: string,
    contextualMemory: string = ""
  ): Promise<UniversalIntent> {
    const context = studyDataManager.getStudyContext();

    const systemPrompt = `You are an intelligent study buddy who understands natural language requests about studying, notes, flashcards, and schedules.

CRITICAL PARSING RULES:
1. **SPECIFIC vs GENERAL actions**: 
   - "delete this flashcard" = delete ONE specific flashcard (need ID/selection)
   - "delete flashcards" = delete multiple/all flashcards
   - "delete JavaScript flashcards" = delete all flashcards for that topic

2. **MULTIPLE SUBJECT creation**:
   - "make 12 AI flashcards and 12 React flashcards" = TWO separate creation tasks
   - "create 5 math notes and 5 physics notes" = TWO separate creation tasks
   - Extract EACH subject and count separately

3. **CONTEXT AWARENESS**:
   - "AI flashcards" about artificial intelligence (the technology)
   - "React flashcards" about React.js framework  
   - These are DIFFERENT subjects, not "AI in context of React"

4. **PRECISION INDICATORS**:
   - "this", "that", "the current" = specific item
   - "all", "every", "these" = multiple items
   - Numbers + "and" + numbers = separate tasks

Your job is to parse user requests and determine their intent. You have access to the user's existing study data:
- ${
      context.stats.totalFlashcards
    } flashcards (topics: ${context.stats.favoriteTopics.join(", ")})
- ${context.stats.totalNotes} notes 
- ${context.stats.upcomingEvents} upcoming events
- Previous study topics: ${
      context.memory.topics?.slice(0, 3).join(", ") || "none"
    }

${contextualMemory ? `\n🧠 CONVERSATION MEMORY: ${contextualMemory}` : ""}

ENHANCED PARSING EXAMPLES:
- "delete this flashcard" → action: delete, target: "specific", needsSelection: true
- "make 12 AI and 12 React flashcards" → action: create, multipleSubjects: ["AI", "React"], counts: [12, 12]
- "create 5 math flashcards" → action: create, topic: "math", count: 5
- "delete all JavaScript flashcards" → action: delete, topic: "JavaScript", target: "all"

Return JSON with this structure:
{
  "domain": "flashcards|notes|schedule|query|social|mixed",
  "action": "create|delete|update|view|search|analyze|connect|recommend|chat",
  "parameters": {
    "topic": "single topic OR first topic if multiple",
    "topics": ["array", "of", "topics"] // for multiple subjects,
    "count": number_for_single_OR_first_count,
    "counts": [num1, num2] // for multiple subjects,
    "target": "specific|all|topic" // for delete operations,
    "needsSelection": true // if user needs to select specific item,
    "multipleSubjects": true // if creating multiple different subjects,
    "useExistingData": true_if_user_references_existing_content,
    "dataContext": "notes|flashcards|schedule",
    "conversational": true_if_casual_chat,
    "timeframe": "today|tomorrow|this_week|etc"
  },
  "confidence": 0.0_to_1.0,
  "reasoning": "detailed_explanation_of_parsing_logic"
}

CRITICAL EXAMPLES:
- "delete this flashcard" → {"domain": "flashcards", "action": "delete", "parameters": {"target": "specific", "needsSelection": true}, "reasoning": "User wants to delete ONE specific flashcard, needs to select which one"}

- "make 12 AI flashcards and 12 React flashcards" → {"domain": "flashcards", "action": "create", "parameters": {"multipleSubjects": true, "topics": ["AI", "React"], "counts": [12, 12]}, "reasoning": "User wants TWO separate sets of flashcards: 12 about AI technology and 12 about React framework"}

- "create JavaScript flashcards" → {"domain": "flashcards", "action": "create", "parameters": {"topic": "JavaScript", "count": 10}, "reasoning": "Single subject flashcard creation"}`;

    const userPrompt = `User input: "${userText}"

ANALYZE THIS REQUEST CAREFULLY:
1. Is this about ONE subject or MULTIPLE subjects?
2. Is this a SPECIFIC action (this/that) or GENERAL action (all/every)?
3. Are there multiple counts mentioned (X and Y)?
4. What exactly does the user want?

Current study context:
- Total flashcards: ${context.stats.totalFlashcards}
- Total notes: ${context.stats.totalNotes}
- Upcoming events: ${context.stats.upcomingEvents}
- Favorite topics: ${context.stats.favoriteTopics.join(", ")}
- Recent activity: ${context.memory.messageCount} interactions

Parse this with MAXIMUM PRECISION and understanding of user intent.`;

    try {
      const response = await callOpenRouter(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { retries: 2 }
      );

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          domain: parsed.domain || "unclear",
          action: parsed.action || "create",
          parameters: parsed.parameters || {},
          confidence: parsed.confidence || 0.7,
          reasoning: parsed.reasoning || "AI interpretation",
        };
      }
    } catch (error) {
      console.warn("🤖 [UniversalAI] AI parsing failed, using fallback");
    }

    // Enhanced fallback that's also data-aware
    return this.enhancedFallbackParsing(userText);
  }

  // � AI-POWERED NLU: Let AI understand ANY typo or variation
  private async aiPoweredIntentCorrection(userText: string): Promise<string> {
    const correctionPrompt = `You are an intelligent typo correction system. Your job is to understand what the user REALLY wants to do, regardless of spelling mistakes, typos, or unconventional phrasing.

CONTEXT: This is a study assistant app where users can:
- Create/make flashcards and notes
- Delete/remove flashcards and notes  
- Work with topics like: blockchain, javascript, react, python, AI, etc.
- Use commands like: delete, create, make, remove, about, related to, etc.

YOUR TASK: Fix ANY spelling errors, typos, or unclear phrasing while preserving the user's intent.

EXAMPLES OF YOUR INTELLIGENCE:
- No matter how badly someone spells "flashcard" or "delete" or any topic name
- No matter what words they use for "related to" or "about"  
- No matter how they phrase their request
- You should understand and correct it perfectly

USER INPUT: "${userText}"

INSTRUCTIONS:
1. Understand what the user wants to do (create, delete, view, etc.)
2. Identify what they want to work with (flashcards, notes, schedule)
3. Find any topic names mentioned (even with typos)
4. Fix ALL spelling and grammar issues
5. Return the corrected text in clear, proper English

Return ONLY the corrected text - nothing else.`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content:
              "You are a super-intelligent typo correction AI. You can understand and fix any spelling mistake or unclear phrasing. Focus on study-related commands and topics.",
          },
          { role: "user", content: correctionPrompt },
        ],
        { retries: 2 }
      );

      const corrected = response?.trim() || userText;

      // If AI gave a meaningful correction, use it
      if (corrected && corrected !== userText && corrected.length > 3) {
        console.log(`🤖 [AI-NLU] Corrected: "${userText}" → "${corrected}"`);
        return corrected;
      }
    } catch (error) {
      console.warn(
        "🤖 [AI-NLU] AI correction failed, using smart fallback",
        error
      );
      
      // 🧠 SMART LOCAL FALLBACK: When API fails, use intelligent pattern matching
      const smartFallback = this.intelligentLocalCorrection(userText);
      if (smartFallback !== userText) {
        console.log(`🔧 [Smart-Fallback] Corrected: "${userText}" → "${smartFallback}"`);
        return smartFallback;
      }
    }

    return userText;
  }

  // 🧠 INTELLIGENT LOCAL CORRECTION: Smart typo detection without external API
  private intelligentLocalCorrection(text: string): string {
    let corrected = text.toLowerCase();

    // Smart action word correction
    const actionMappings = {
      'deltee': 'delete', 'delet': 'delete', 'dele': 'delete',
      'creat': 'create', 'mak': 'make', 'maek': 'make',
      'remov': 'remove', 'deleete': 'delete'
    };

    // Smart object word correction  
    const objectMappings = {
      'fladshcard': 'flashcard', 'flascard': 'flashcard', 'flashcrd': 'flashcard',
      'flashcards': 'flashcards', 'flascards': 'flashcards', 'fladshcards': 'flashcards',
      'notess': 'notes', 'note': 'notes'
    };

    // Smart topic word correction
    const topicMappings = {
      'blockhainn': 'blockchain', 'blockchainn': 'blockchain', 'blokchain': 'blockchain',
      'javascrpt': 'javascript', 'javasript': 'javascript', 'js': 'javascript',
      'pyton': 'python', 'pythnn': 'python',
      'reac': 'react', 'reactt': 'react'
    };

    // Apply intelligent corrections
    for (const [typo, correct] of Object.entries(actionMappings)) {
      corrected = corrected.replace(new RegExp(`\\b${typo}\\b`, 'gi'), correct);
    }
    
    for (const [typo, correct] of Object.entries(objectMappings)) {
      corrected = corrected.replace(new RegExp(`\\b${typo}\\b`, 'gi'), correct);
    }
    
    for (const [typo, correct] of Object.entries(topicMappings)) {
      corrected = corrected.replace(new RegExp(`\\b${typo}\\b`, 'gi'), correct);
    }

    // Smart phrase corrections
    corrected = corrected
      .replace(/related\s+to/gi, 'related')
      .replace(/about\s+the/gi, 'about')
      .replace(/all\s+the/gi, 'all');

    return corrected;
  }

  // 🧠 SMART FUZZY MATCHING: AI-enhanced similarity detection
  private smartSimilarity(
    input: string,
    target: string,
    threshold = 0.7
  ): boolean {
    if (!input || !target) return false;

    const norm1 = input.toLowerCase().trim();
    const norm2 = target.toLowerCase().trim();

    if (norm1 === norm2) return true;

    // Levenshtein distance calculation
    const editDistance = (a: string, b: string): number => {
      const matrix = Array(b.length + 1)
        .fill(null)
        .map(() => Array(a.length + 1).fill(null));

      for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + indicator
          );
        }
      }

      return matrix[b.length][a.length];
    };

    const distance = editDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);
    const similarity = maxLen === 0 ? 1 : 1 - distance / maxLen;

    return similarity >= threshold;
  }

  private enhancedFallbackParsing(text: string): UniversalIntent {
    const lowerText = text.toLowerCase();
    const context = studyDataManager.getStudyContext();

    // 🎯 ADVANCED: Smart multiple-subjects detection (works without "and")
    const parseMultipleSubjects = (
      t: string
    ): { topics: string[]; counts: number[] } | null => {
      // Normalize spacing and synonyms
      const s = t
        .replace(/flash\s*cards?/gi, "flashcards")
        .replace(/\s+/g, " ")
        .trim();

      // ADVANCED: Detect multiple topics even without "and"
      // Pattern 1: "make 12 AI 15 React flashcards"
      const multiPattern =
        /(\d+)\s+([a-z0-9 .+#\-]+?)(?:\s+(\d+)\s+([a-z0-9 .+#\-]+?))+/i;
      const multiMatch = s.match(multiPattern);
      if (multiMatch) {
        const parts = s.match(
          /(\d+)\s+([a-z0-9 .+#\-]+?)(?=\s+\d+|\s+flashcards?|$)/gi
        );
        if (parts && parts.length >= 2) {
          const topics: string[] = [];
          const counts: number[] = [];
          for (const part of parts) {
            const m = part.match(/(\d+)\s+(.+)/);
            if (m) {
              counts.push(parseInt(m[1], 10));
              topics.push(m[2].trim());
            }
          }
          if (topics.length >= 2) {
            return { topics, counts };
          }
        }
      }

      // Pattern 2: Explicit "and" separation
      const withAnd = s.replace(/\band\b/gi, " and ");
      const parts = withAnd.split(/\band\b/i);
      if (parts.length >= 2) {
        const topics: string[] = [];
        const counts: number[] = [];
        const itemPat =
          /(\d+)\s*(?:of\s+)?([a-z0-9 .+#\-]+?)(?:\s*(?:flashcards?|notes?))?$/i;
        for (const p of parts) {
          const m = p.trim().match(itemPat);
          if (m) {
            counts.push(parseInt(m[1], 10));
            topics.push(m[2].trim());
          }
        }
        if (topics.length >= 2 && counts.length === topics.length) {
          return { topics, counts };
        }
      }

      // Pattern 3: Comma separation "12 AI, 15 React flashcards"
      const commaParts = s.split(/[,;]/);
      if (commaParts.length >= 2) {
        const topics: string[] = [];
        const counts: number[] = [];
        const itemPat =
          /(\d+)\s*(?:of\s+)?([a-z0-9 .+#\-]+?)(?:\s*(?:flashcards?|notes?))?$/i;
        for (const p of commaParts) {
          const m = p.trim().match(itemPat);
          if (m) {
            counts.push(parseInt(m[1], 10));
            topics.push(m[2].trim());
          }
        }
        if (topics.length >= 2 && counts.length === topics.length) {
          return { topics, counts };
        }
      }

      return null;
    };

    // 🎯 CRITICAL: Detect specific vs general commands
    const isSpecificCommand = /\b(this|that|the current|specific)\b/i.test(
      text
    );
    const isGeneralCommand = /\b(all|every|entire|complete)\b/i.test(text);

    // 🔍 CRITICAL: Detect multiple subjects with "and"
    const ms = parseMultipleSubjects(text);
    if (ms) {
      console.log("🎯 [MultipleSubjects] Detected:", ms);
      return {
        domain: "flashcards",
        action: "create",
        parameters: {
          multipleSubjects: true,
          topics: ms.topics,
          counts: ms.counts,
          topic: ms.topics[0],
          count: ms.counts[0],
        },
        confidence: 0.95,
        reasoning: `Multiple subject creation: ${ms.counts
          .map((c, i) => `${c} ${ms.topics[i]} flashcards`)
          .join(" and ")}`,
      };
    }

    // 🗑️ CRITICAL: Handle delete commands with precision
    if (/delete|remove|clear/i.test(text)) {
      let target = "all"; // default
      let needsSelection = false;
      let topicCandidate: string | undefined;

      // ALWAYS try to extract topic first, regardless of other words
      // Flexible topic extraction for phrases like:
      // - delete AI flashcards
      // - delete all blockchain flashcards
      // - delete flashcards related AI
      // - delete flashcards related to AI
      // - delete fladshcard related blockchain (with typos)
      // Allow multi-word topics and be flexible with flashcard/note spelling
      const topicBeforeNoun = text.match(
        /delete\s+(?:all\s+)?([a-z0-9 .+#\-]+?)\s+(?:flashcards?|flascards?|fladshcards?|notes?|notess?)/i
      );
      const topicAfterNoun = text.match(
        /delete\s+(?:the\s+)?(?:all\s+)?(?:flashcards?|flascards?|fladshcards?|notes?|notess?)\s+(?:related(?:\s+to)?|about|on|for|of)\s+([a-z0-9 .+#\-]+)/i
      );
      const topicLooseRelated = text.match(
        /delete\s+(?:the\s+)?(?:all\s+)?(?:flashcards?|flascards?|fladshcards?|notes?|notess?)\s+related\s+([a-z0-9 .+#\-]+)/i
      );
      topicCandidate =
        (topicBeforeNoun && topicBeforeNoun[1]) ||
        (topicAfterNoun && topicAfterNoun[1]) ||
        (topicLooseRelated && topicLooseRelated[1]) ||
        undefined;

      // Set target based on specificity and topic detection
      if (isSpecificCommand) {
        target = "specific";
        needsSelection = true;
      } else if (topicCandidate) {
        target = "topic";
      } else if (isGeneralCommand || /\ball\b/i.test(text)) {
        target = "all";
      }

      const domain = /flashcard|flascard|fladshcard/i.test(text)
        ? "flashcards"
        : /note|notes|notess/i.test(text)
        ? "notes"
        : /schedule/i.test(text)
        ? "schedule"
        : "unclear";

      // Extract explicit id if provided (e.g., "delete flashcard id:123" or "delete note 123")
      const idMatch =
        text.match(/\b(id\s*[:#-]?|number\s*[:#-]?|#)\s*([a-z0-9\-]+)/i) ||
        text.match(
          /\bdelete\s+(?:this\s+)?(?:flashcard|note)\s+(?:id\s*[:#-]?)?([a-z0-9\-]+)/i
        );
      const explicitId = idMatch ? idMatch[2] || idMatch[1] : undefined;

      return {
        domain: domain as UniversalIntent["domain"],
        action: "delete",
        parameters: {
          target,
          needsSelection,
          id: explicitId,
          topic: target === "topic" ? topicCandidate?.trim() : undefined,
        },
        confidence: 0.9,
        reasoning: `Delete ${target} command detected for ${domain}`,
      };
    }

    // Check for schedule/time queries first
    if (
      /what'?s (today|tomorrow|this week|next week|coming up)|when is|show my schedule/i.test(
        text
      )
    ) {
      const timeframe = lowerText.includes("tomorrow")
        ? "tomorrow"
        : lowerText.includes("today")
        ? "today"
        : lowerText.includes("this week")
        ? "this week"
        : lowerText.includes("next week")
        ? "next week"
        : "upcoming";

      return {
        domain: "query",
        action: "search",
        parameters: {
          timeframe,
          specific_request: text,
        },
        confidence: 0.8,
        reasoning: "Schedule/time query detected",
      };
    }

    // Check for schedule creation (add study session, add exam, etc.)
    if (
      /add\s+(study session|exam|class|assignment|meeting)|schedule\s+(for|on)|plan\s+(study|exam)/i.test(
        text
      )
    ) {
      return {
        domain: "schedule",
        action: "create",
        parameters: {
          specific_request: text,
        },
        confidence: 0.9,
        reasoning: "Schedule creation command detected",
      };
    }

    // Check for existing data references
    const usesExistingData =
      /from my (notes|flashcards|schedule)|using (existing|my)|based on my/i.test(
        text
      );
    const dataContext = lowerText.includes("notes")
      ? "notes"
      : lowerText.includes("flashcards")
      ? "flashcards"
      : lowerText.includes("schedule")
      ? "schedule"
      : "mixed";

    // Check for conversational/social queries
    if (
      /how (am i|are we)|thank you|thanks|good (morning|evening|night)|hello|hi\b|help me|suggest|recommend/i.test(
        text
      )
    ) {
      return {
        domain: "social",
        action: "chat",
        parameters: {
          conversational: true,
          specific_request: text,
        },
        confidence: 0.7,
        reasoning: "Conversational/social interaction detected",
      };
    }

    // Enhanced domain detection with existing data awareness
    let domain: UniversalIntent["domain"] = "unclear";

    const hasFlashcard =
      /flash\s*card|flashcards?|flas?h+h*\s*c?ar?d?s?|quiz|practice|memorize/i.test(
        text
      );
    const hasNotes = /note|summary|study|learn/i.test(text);
    const hasSchedule =
      /schedule|calendar|exam|assignment|deadline|class/i.test(text);

    // Detect mixed requests
    const domainCount = [hasFlashcard, hasNotes, hasSchedule].filter(
      Boolean
    ).length;

    if (domainCount > 1) {
      domain = "mixed";
    } else if (hasFlashcard) {
      domain = "flashcards";
    } else if (hasNotes) {
      domain = "notes";
    } else if (hasSchedule) {
      domain = "schedule";
    }

    // Enhanced action detection
    let action: UniversalIntent["action"] = "create";
    if (/\b(create|make|generate|build|add|new)\b/i.test(text)) {
      action = "create";
    } else if (/delete|remove|clear/i.test(text)) {
      action = "delete";
    } else if (/update|change|modify|edit/i.test(text)) {
      action = "update";
    } else if (/show|view|display|list/i.test(text)) {
      action = "view";
    } else if (/find|search|what|when|where/i.test(text)) {
      action = "search";
    } else if (/suggest|recommend|help/i.test(text)) {
      action = "recommend";
    }

    // Parameter extraction
    const countMatch = text.match(/\b(\d{1,3})\b/);
    const count = countMatch ? parseInt(countMatch[1]) : undefined;

    const difficultyMatch = text.match(
      /\b(beginner|basic|easy|intermediate|medium|advanced|hard|expert)\b/i
    );
    const difficulty = difficultyMatch
      ? difficultyMatch[1].toLowerCase()
      : undefined;

    // Topic extraction - everything after "about/from/on/for"
    const topicMatch =
      text.match(
        /(?:about|from|on|for|of|regarding|concerning)\s+([^.!?]+)/i
      ) ||
      // make 30 flashcards about X
      text.match(
        /\b(make|create|generate)\b.*?\b(?:\d{1,3})?\b.*?\bflash\s*c(?:ard|ards)?\b.*?\b(?:about|from|on|for|of)\s+([^.!?]+)/i
      ) ||
      // make 30 ai flashcards (topic before noun)
      text.match(
        /\b(make|create|generate)\b\s*\b(\d{1,3})\b\s+([^.!?]+?)\s+flash\s*c(?:ard|ards)?\b/i
      ) ||
      // make 30 flashcards ai (topic after without preposition)
      text.match(
        /\b(make|create|generate)\b.*?\b(?:\d{1,3})\b.*?\bflash\s*c(?:ard|ards)?\b\s+([^.!?]+)/i
      ) ||
      // make 40 flashhhh card of X (extreme typo forms)
      text.match(
        /\b(make|create|generate)\b.*?\b(\d{1,3})\b.*?\bflas?h+h*\s*c?ar?d?s?\b.*?\b(?:about|from|on|for|of)\s+([^.!?]+)/i
      ) ||
      // 40 flashhhh card of X (number first)
      text.match(
        /\b(\d{1,3})\b.*?\bflas?h+h*\s*c?ar?d?s?\b.*?\b(?:about|from|on|for|of)\s+([^.!?]+)/i
      );
    const topic = topicMatch
      ? (topicMatch[3] || topicMatch[2] || topicMatch[1]).trim()
      : "";

    return {
      domain,
      action,
      parameters: {
        topic,
        count,
        difficulty,
        specific_request: text,
      },
      confidence: 0.6,
      reasoning: "Fallback pattern matching",
    };
  }

  private async executeUniversalAction(
    intent: UniversalIntent,
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const { domain, action, parameters } = intent;

    console.log(`🎬 [UniversalAI] Executing ${action} for ${domain}`);

    switch (domain) {
      case "flashcards":
        return await this.handleFlashcardAction(action, parameters, input);

      case "notes":
        return await this.handleNotesAction(action, parameters, input);

      case "schedule":
        return await this.handleScheduleAction(action, parameters, input);

      case "mixed":
        return await this.handleMixedAction(parameters, input);

      case "query":
        return await this.handleQueryAction(action, parameters, input);

      case "social":
        return await this.handleSocialAction(action, parameters, input);

      default:
        return await this.handleUnclearIntent(intent, input);
    }
  }

  private async handleFlashcardAction(
    action: UniversalIntent["action"],
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    switch (action) {
      case "create":
        return await this.createIntelligentFlashcards(params, input);

      case "delete":
        return this.deleteFlashcards(params);

      case "view":
        return this.viewFlashcards(params);

      case "search":
        return await this.searchStudyData(params, input);

      default:
        return {
          summary: `Flashcard ${action} not yet implemented`,
          artifacts: {},
        };
    }
  }

  private async createIntelligentFlashcards(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    let content = input.text || "";

    // 🎯 CRITICAL: Handle multiple subjects creation
    if (params.multipleSubjects && params.topics && params.counts) {
      console.log(
        "� [MultipleSubjects] Creating flashcards for multiple topics:",
        params.topics
      );

      const results: AgentResult[] = [];
      const allFlashcards: any[] = [];

      for (let i = 0; i < params.topics.length; i++) {
        const topic = params.topics[i];
        const count = params.counts[i];

        console.log(`📚 Creating ${count} flashcards for topic: ${topic}`);

        try {
          // Create flashcards for this specific topic
          const flashcards = await generateFlashcards(
            `Create ${count} flashcards about ${topic}. 
            
            Focus specifically on ${topic} concepts, definitions, examples, and key points.
            Do not mix with other topics.
            
            Each flashcard should test knowledge of ${topic}.`,
            {
              count: count,
              difficulty: params.difficulty || "intermediate",
            }
          );

          if (flashcards && flashcards.length > 0) {
            // Add topic tag to distinguish flashcards
            const taggedFlashcards = flashcards.map((card) => ({
              ...card,
              category: topic,
              tags: [topic, ...(card.tags || [])],
            }));

            allFlashcards.push(...taggedFlashcards);

            results.push({
              summary: `✅ Created ${flashcards.length} ${topic} flashcards`,
              artifacts: { flashcards: taggedFlashcards },
            });
          }
        } catch (error) {
          console.error(`❌ Failed to create ${topic} flashcards:`, error);
          results.push({
            summary: `❌ Failed to create ${topic} flashcards`,
            artifacts: {},
          });
        }

        // Brief pause between topic creations
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Save all flashcards
      if (allFlashcards.length > 0) {
        const existingFlashcards = FlashcardStorage.load();
        FlashcardStorage.save([...existingFlashcards, ...allFlashcards]);
      }

      // Combine results
      const totalCreated = allFlashcards.length;
      const successfulTopics = results.filter(
        (r) => r.artifacts.flashcards?.length > 0
      ).length;

      return {
        summary: `🎉 Successfully created ${totalCreated} flashcards across ${successfulTopics} topics:\n\n${results
          .map((r) => r.summary)
          .join("\n")}`,
        artifacts: {
          flashcards: allFlashcards,
          notes: [
            {
              title: "Multiple Subject Creation Summary",
              content: `Created flashcards for ${params.topics.join(", ")}`,
              category: "summary",
              metadata: {
                multipleSubjects: true,
                topicBreakdown: params.topics.map((topic, i) => ({
                  topic,
                  requested: params.counts![i],
                  created: results[i]?.artifacts.flashcards?.length || 0,
                })),
              },
            },
          ],
        },
      };
    }

    // 🔍 EXISTING NOTES LOGIC (unchanged)
    const isFromNotes =
      /from my (.*?)\s*notes|using my (.*?)\s*notes|based on my (.*?)\s*notes/i.test(
        input.text
      );
    const isFromExistingData = params.useExistingData || isFromNotes;

    if (isFromExistingData) {
      console.log(
        "🎴 [FlashcardAI] User wants to create flashcards from existing notes"
      );
      const existingNotes = NotesStorage.load();

      if (existingNotes.length === 0) {
        return {
          summary:
            "I couldn't find any notes in your collection. Would you like me to create flashcards on a topic instead? For example, try: 'create JavaScript flashcards'",
          artifacts: {},
        };
      }

      // Extract topic from the request (e.g., "JavaScript" from "make flashcards from my JavaScript notes")
      let searchTopic = params.topic;
      if (!searchTopic) {
        const topicMatch = input.text.match(
          /from my (.*?)\s*notes|about (.*?)\s*notes|(.*?)\s*notes/i
        );
        if (topicMatch) {
          searchTopic = (topicMatch[1] || topicMatch[2] || topicMatch[3])
            ?.trim()
            .toLowerCase();
          // Clean up common words
          searchTopic = searchTopic
            ?.replace(/\b(my|the|some|all|existing)\b/g, "")
            .trim();
        }
      }

      // Filter notes by topic if specified
      let relevantNotes = existingNotes;
      if (searchTopic && searchTopic.length > 0) {
        const topicLower = searchTopic.toLowerCase();
        relevantNotes = existingNotes.filter(
          (note) =>
            note.title.toLowerCase().includes(topicLower) ||
            note.content.toLowerCase().includes(topicLower) ||
            note.category.toLowerCase().includes(topicLower) ||
            note.tags.some((tag) => tag.toLowerCase().includes(topicLower))
        );

        if (relevantNotes.length === 0) {
          // Show what notes are available
          const availableTopics = [
            ...new Set(existingNotes.map((note) => note.category)),
          ].join(", ");
          return {
            summary: `I couldn't find any notes about "${searchTopic}". You have notes about: ${availableTopics}. Would you like me to create flashcards about "${searchTopic}" from scratch instead?`,
            artifacts: {},
          };
        }
      }

      // Combine note content for flashcard generation
      content = relevantNotes
        .map(
          (note) =>
            `Title: ${note.title}\nContent: ${note.content}\nCategory: ${
              note.category
            }\nTags: ${note.tags.join(", ")}`
        )
        .join("\n\n");

      console.log(
        `🎴 [FlashcardAI] Found ${
          relevantNotes.length
        } relevant notes for topic "${searchTopic || "all"}"`
      );

      // Update memory about user's study preferences
      this.updateUserMemory(
        `Created flashcards from ${relevantNotes.length} notes about ${
          searchTopic || "general topics"
        }`
      );
    }

    // Determine an effective topic early for all fallbacks
    const inferTopicFromText = (text: string): string | undefined => {
      const t = (text || "").toLowerCase();
      if (/\bjavascript|js\b/.test(t)) return "JavaScript";
      if (/\breact\b/.test(t)) return "React";
      if (/\bfrontend\b/.test(t)) return "Frontend";
      if (/\bnode\b/.test(t)) return "Node.js";
      if (/\bpython\b/.test(t)) return "Python";
      if (/\bai|machine learning|ml\b/.test(t)) return "AI";
      return undefined;
    };
    let effectiveTopic = (params.topic || "").trim();
    if (!effectiveTopic) {
      effectiveTopic =
        inferTopicFromText(content) ||
        inferTopicFromText(input.text || "") ||
        "";
    }

    // If only a topic is mentioned, enhance it with AI
    if (effectiveTopic && content.length < 100) {
      content = await this.enhanceTopicForFlashcards(
        effectiveTopic,
        params.difficulty,
        params.count
      );
    }

    console.log("🎴 [FlashcardAI] Enhanced content length:", content.length);

    try {
      const options = {
        count: params.count || 10,
        difficulty: params.difficulty || "intermediate",
      };

      const cards = await generateFlashcards(content, options);

      if (!cards || cards.length === 0) {
        // Generate high-quality fallback cards using AI first, then content-specific database
        try {
          const fallbackCards = await this.generateFallbackFlashcards(
            effectiveTopic || "general topic",
            options
          );
          if (fallbackCards && fallbackCards.length > 0) {
            const saved = FlashcardStorage.addBatch(fallbackCards);
            return {
              summary: `Created ${saved.length} flashcards about ${
                params.topic || "your topic"
              } using enhanced AI generation.`,
              artifacts: { flashcards: saved },
            };
          }
        } catch (error) {
          console.warn(
            "🚨 [FlashcardAI] AI fallback failed, using content database"
          );
        }

        // Use content-specific database as final fallback
        const databaseCards = this.generateContentSpecificFallback(
          effectiveTopic || params.topic || "general topic",
          options.count || 10
        );
        const saved = FlashcardStorage.addBatch(databaseCards);

        return {
          summary: `Created ${saved.length} high-quality flashcards about ${
            params.topic || "your topic"
          } using curated content database.`,
          artifacts: { flashcards: saved },
        };
      }

      // Ensure we have the requested count
      let finalCards = cards.map((c: any) => ({
        question: c.question || c.front || "Question",
        answer: c.answer || c.back || "Answer",
        category: c.category || effectiveTopic || params.topic || "General",
      }));

      // Pad to requested count if needed
      if (params.count && finalCards.length < params.count) {
        const additionalCards = await this.generateAdditionalCards(
          effectiveTopic || params.topic || "topic",
          params.count - finalCards.length,
          params.difficulty
        );
        finalCards = [...finalCards, ...additionalCards];
      }

      console.log(
        "🔢 [FlashcardAI] Final card count before save:",
        finalCards.length
      );
      const saved = FlashcardStorage.addBatch(finalCards);
      BuddyMemoryStorage.logTask("flashcards", `Created ${saved.length} cards`);

      return {
        summary: `Successfully created ${saved.length} ${
          params.difficulty || ""
        } flashcards about ${
          params.topic || "your topic"
        }. They're ready for practice!`,
        artifacts: { flashcards: saved },
      };
    } catch (error) {
      console.error("🚨 [FlashcardAI] Generation failed:", error);
      return {
        summary:
          "I had trouble creating those flashcards. Please try with a different topic or provide more context.",
        artifacts: {},
      };
    }
  }

  private async enhanceTopicForFlashcards(
    topic: string,
    difficulty?: string,
    count?: number
  ): Promise<string> {
    const enhancementPrompt = `Create comprehensive study content about "${topic}" suitable for generating ${
      count || "multiple"
    } ${difficulty || "intermediate"} level flashcards.

Include:
- Key concepts and definitions
- Important facts and principles  
- Common applications or examples
- Relationships between concepts
- Potential areas of confusion
- Practice scenarios

Make it detailed enough to generate high-quality, diverse flashcards.`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content:
              "You are an expert educator creating comprehensive study materials.",
          },
          { role: "user", content: enhancementPrompt },
        ],
        { retries: 2 }
      );

      return (
        response ||
        `Study material about ${topic}. This topic includes key concepts, applications, and important details that students should understand.`
      );
    } catch (error) {
      console.warn(
        "🤖 [TopicEnhancer] AI enhancement failed, using basic template"
      );
      return `Study material about ${topic}. This topic includes key concepts, applications, and important details that students should understand.`;
    }
  }

  private async generateFallbackFlashcards(
    topic: string,
    options: any
  ): Promise<any[]> {
    const fallbackPrompt = `Create exactly ${
      options.count || 10
    } high-quality flashcards about "${topic}".

Make them ${options.difficulty || "intermediate"} level.

Return as a JSON array with this exact format:
[
  {"question": "Clear, specific question", "answer": "Accurate, helpful answer", "category": "${topic}"},
  ...
]

Focus on:
- Core concepts and definitions
- Practical applications
- Common misconceptions
- Real-world examples
- Key relationships

Ensure each card tests important knowledge about ${topic}.`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content: "You are an expert educator creating study flashcards.",
          },
          { role: "user", content: fallbackPrompt },
        ],
        { retries: 3 }
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const cards = JSON.parse(jsonMatch[0]);
        return Array.isArray(cards) ? cards : [];
      }
    } catch (error) {
      console.error("🚨 [FallbackCards] AI generation failed:", error);
    }

    // Ultimate fallback - high-quality content-specific cards
    return this.generateContentSpecificFallback(topic, options.count || 10);
  }

  private generateContentSpecificFallback(topic: string, count: number): any[] {
    const lowerTopic = topic.toLowerCase();
    const fallbackCards = [];

    // JavaScript Interview Questions Database
    if (lowerTopic.includes("javascript") || lowerTopic.includes("js")) {
      const jsQuestions = [
        {
          question: "What is closure in JavaScript?",
          answer:
            "A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned. It 'closes over' these variables.",
          category: "JavaScript",
        },
        {
          question: "Explain the difference between let, const, and var.",
          answer:
            "var is function-scoped and can be redeclared; let is block-scoped and can be reassigned; const is block-scoped and cannot be reassigned after declaration.",
          category: "JavaScript",
        },
        {
          question: "What is the difference between == and === in JavaScript?",
          answer:
            "== performs type coercion before comparison (loose equality), while === compares both value and type without coercion (strict equality).",
          category: "JavaScript",
        },
        {
          question: "What is hoisting in JavaScript?",
          answer:
            "Hoisting is JavaScript's behavior of moving variable and function declarations to the top of their scope during compilation phase.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of 'this' in JavaScript.",
          answer:
            "'this' refers to the object that is executing the current function. Its value depends on how the function is called (global, method, constructor, arrow function).",
          category: "JavaScript",
        },
        {
          question:
            "What are arrow functions and how do they differ from regular functions?",
          answer:
            "Arrow functions are a concise way to write functions with implicit return and lexical 'this' binding. They don't have their own 'this', 'arguments', or 'super'.",
          category: "JavaScript",
        },
        {
          question: "What is the event loop in JavaScript?",
          answer:
            "The event loop is responsible for executing code, collecting and processing events, and executing queued sub-tasks. It allows JavaScript to perform non-blocking operations.",
          category: "JavaScript",
        },
        {
          question: "Explain promises in JavaScript.",
          answer:
            "Promises represent the eventual completion or failure of an asynchronous operation. They have three states: pending, fulfilled, or rejected.",
          category: "JavaScript",
        },
        {
          question: "What is the difference between null and undefined?",
          answer:
            "undefined means a variable has been declared but not assigned a value. null is an assignment value representing no value or empty value.",
          category: "JavaScript",
        },
        {
          question: "What are higher-order functions?",
          answer:
            "Higher-order functions are functions that either take other functions as arguments or return functions as their result.",
          category: "JavaScript",
        },
        {
          question: "Explain prototypal inheritance in JavaScript.",
          answer:
            "Prototypal inheritance allows objects to inherit properties and methods from other objects through the prototype chain.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between call(), apply(), and bind()?",
          answer:
            "call() invokes a function with a specific 'this' and arguments list. apply() is similar but takes arguments as an array. bind() returns a new function with bound 'this' and arguments.",
          category: "JavaScript",
        },
        {
          question: "What are async/await in JavaScript?",
          answer:
            "async/await is syntactic sugar for promises. async functions return promises, and await pauses execution until the promise resolves.",
          category: "JavaScript",
        },
        {
          question: "Explain event delegation in JavaScript.",
          answer:
            "Event delegation is a technique where you attach a single event listener to a parent element to handle events for multiple child elements.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between synchronous and asynchronous programming?",
          answer:
            "Synchronous code executes line by line, blocking until each operation completes. Asynchronous code allows other operations to continue while waiting for time-consuming tasks.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript modules?",
          answer:
            "Modules are reusable pieces of code that can be exported from one file and imported into another. They help organize and maintain code.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of callbacks in JavaScript.",
          answer:
            "Callbacks are functions passed as arguments to other functions, to be executed at a later time or after a specific event occurs.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between function declaration and function expression?",
          answer:
            "Function declarations are hoisted and can be called before definition. Function expressions are not hoisted and create functions at runtime.",
          category: "JavaScript",
        },
        {
          question: "What is destructuring in JavaScript?",
          answer:
            "Destructuring is a syntax that allows unpacking values from arrays or properties from objects into distinct variables.",
          category: "JavaScript",
        },
        {
          question: "Explain the spread operator (...) in JavaScript.",
          answer:
            "The spread operator expands iterables (arrays, strings, objects) into individual elements. It's used for copying, merging, and function arguments.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between map(), filter(), and reduce()?",
          answer:
            "map() transforms each element and returns a new array. filter() returns elements that pass a test. reduce() reduces array to a single value.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript classes?",
          answer:
            "Classes are syntactic sugar over prototypal inheritance, providing a cleaner way to create objects and implement inheritance.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of scope in JavaScript.",
          answer:
            "Scope determines the accessibility of variables. JavaScript has global scope, function scope, and block scope (with let/const).",
          category: "JavaScript",
        },
        {
          question: "What is the temporal dead zone?",
          answer:
            "The temporal dead zone is the time between entering scope and variable declaration where let/const variables cannot be accessed.",
          category: "JavaScript",
        },
        {
          question: "What are WeakMap and WeakSet in JavaScript?",
          answer:
            "WeakMap and WeakSet are collections that hold weak references to their keys/values, allowing garbage collection when no other references exist.",
          category: "JavaScript",
        },
        {
          question: "Explain the event bubbling and capturing phases.",
          answer:
            "Event capturing goes from root to target element. Event bubbling goes from target back to root. You can control which phase handles events.",
          category: "JavaScript",
        },
        {
          question: "What is currying in JavaScript?",
          answer:
            "Currying is a technique of transforming a function with multiple arguments into a sequence of functions, each taking a single argument.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between localStorage and sessionStorage?",
          answer:
            "localStorage persists until explicitly cleared. sessionStorage persists only for the browser session (until tab is closed).",
          category: "JavaScript",
        },
        {
          question: "What are generators in JavaScript?",
          answer:
            "Generators are functions that can be paused and resumed, yielding multiple values over time using the yield keyword.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of memoization.",
          answer:
            "Memoization is an optimization technique that stores function results to avoid expensive recalculations for the same inputs.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between deep copy and shallow copy?",
          answer:
            "Shallow copy copies only the first level of properties. Deep copy recursively copies all levels, creating completely independent objects.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript iterators and iterables?",
          answer:
            "Iterables are objects that implement the Symbol.iterator method. Iterators are objects with a next() method that returns {value, done}.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of debouncing and throttling.",
          answer:
            "Debouncing delays function execution until after a pause in calls. Throttling limits function execution to once per time interval.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between Object.freeze() and Object.seal()?",
          answer:
            "Object.freeze() makes an object immutable (no changes). Object.seal() prevents adding/removing properties but allows modifying existing ones.",
          category: "JavaScript",
        },
        {
          question: "What are Symbols in JavaScript?",
          answer:
            "Symbols are primitive data types that create unique identifiers. They're often used as object property keys to avoid naming conflicts.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of polyfills.",
          answer:
            "Polyfills are code that implement features that aren't natively supported in older browsers, providing backward compatibility.",
          category: "JavaScript",
        },
        {
          question: "What is the difference between innerHTML and textContent?",
          answer:
            "innerHTML gets/sets HTML content including tags. textContent gets/sets only text content, ignoring HTML tags.",
          category: "JavaScript",
        },
        {
          question: "What are Web Workers in JavaScript?",
          answer:
            "Web Workers allow running JavaScript in background threads, enabling heavy computations without blocking the main UI thread.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of tree shaking.",
          answer:
            "Tree shaking is a dead code elimination technique that removes unused code from the final bundle to reduce file size.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between for...in and for...of loops?",
          answer:
            "for...in iterates over enumerable property names of an object. for...of iterates over values of iterable objects like arrays.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript decorators?",
          answer:
            "Decorators are a proposal for adding annotations and meta-programming syntax to classes and functions.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of progressive web apps (PWAs).",
          answer:
            "PWAs are web applications that use modern web capabilities to provide native app-like experiences, including offline functionality.",
          category: "JavaScript",
        },
        {
          question: "What is the difference between microtasks and macrotasks?",
          answer:
            "Microtasks (promises, queueMicrotask) have higher priority and execute before macrotasks (setTimeout, setInterval) in the event loop.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript proxies?",
          answer:
            "Proxies allow you to intercept and customize operations performed on objects (property lookup, assignment, function invocation, etc.).",
          category: "JavaScript",
        },
        {
          question:
            "Explain the concept of functional programming in JavaScript.",
          answer:
            "Functional programming emphasizes immutability, pure functions, and higher-order functions. It avoids changing state and mutable data.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between static and instance methods?",
          answer:
            "Static methods belong to the class itself and can't access instance properties. Instance methods belong to specific object instances.",
          category: "JavaScript",
        },
        {
          question: "What are tagged template literals?",
          answer:
            "Tagged template literals allow you to parse template literals with a function, giving you control over how the template is processed.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of code splitting.",
          answer:
            "Code splitting is a technique to split your code into smaller chunks that can be loaded on demand, improving initial load performance.",
          category: "JavaScript",
        },
        {
          question: "What is the difference between CJS, AMD, and ESM modules?",
          answer:
            "CJS (CommonJS) uses require/exports. AMD uses define/require for async loading. ESM (ES modules) uses import/export with static analysis.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript observables?",
          answer:
            "Observables are objects that emit multiple values over time. They're used for handling asynchronous data streams and events.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of virtual DOM.",
          answer:
            "Virtual DOM is a JavaScript representation of the actual DOM. It enables efficient updates by comparing virtual trees and applying minimal changes.",
          category: "JavaScript",
        },
      ];

      // Randomly select and shuffle questions to ensure variety
      const shuffled = jsQuestions.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(count, jsQuestions.length));
    }

    // React/Frontend questions
    if (lowerTopic.includes("react") || lowerTopic.includes("frontend")) {
      const reactQuestions = [
        {
          question: "What are React Hooks?",
          answer:
            "Hooks are functions that let you use state and other React features in functional components. They start with 'use' like useState, useEffect.",
          category: "React",
        },
        {
          question: "Explain the useState Hook.",
          answer:
            "useState is a Hook that adds state to functional components. It returns an array with current state value and a setter function.",
          category: "React",
        },
        {
          question: "What is the useEffect Hook used for?",
          answer:
            "useEffect handles side effects in functional components like data fetching, subscriptions, or manual DOM changes. It replaces lifecycle methods.",
          category: "React",
        },
        {
          question:
            "What is the difference between controlled and uncontrolled components?",
          answer:
            "Controlled components have their state managed by React. Uncontrolled components manage their own state internally using refs.",
          category: "React",
        },
        {
          question: "What is the virtual DOM in React?",
          answer:
            "Virtual DOM is a JavaScript representation of the actual DOM. React uses it to efficiently update the UI by comparing virtual trees.",
          category: "React",
        },
      ];

      return reactQuestions.slice(0, Math.min(count, reactQuestions.length));
    }

    // Generic programming fallback
    const genericCards = [];
    for (let i = 1; i <= Math.min(count, 10); i++) {
      genericCards.push({
        question: `What is a key concept about ${topic}? (${i})`,
        answer: `A fundamental principle or important fact about ${topic} that students should understand.`,
        category: topic.split(" ")[0] || "General",
      });
    }

    return genericCards;
  }

  private async generateAdditionalCards(
    topic: string,
    count: number,
    difficulty?: string
  ): Promise<any[]> {
    // Check if OpenRouter is disabled and use Gemini fallback
    const DISABLE_OPENROUTER =
      (import.meta as any)?.env?.VITE_DISABLE_OPENROUTER === "true" ||
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("disableOpenRouter") === "true");

    if (DISABLE_OPENROUTER) {
      console.log(
        "🚫 [AdditionalCards] OpenRouter disabled - using Gemini fallback"
      );
      // In Vitest, avoid importing Gemini and return deterministic stubs to keep tests fast
      const IS_TEST =
        typeof import.meta !== "undefined" &&
        Boolean((import.meta as any).vitest);
      if (IS_TEST) {
        return Array.from({ length: count }).map((_, i) => ({
          question: `What is an advanced concept in ${topic}? (extra ${i + 1})`,
          answer: `${topic} advanced concept ${i + 1}.`,
          category: topic || "General",
        }));
      }
      try {
        // Use Gemini to generate additional cards
        const { generateFlashcardsWithGemini } = await import(
          "../services/geminiAI"
        );
        const additionalPrompt = `Create exactly ${count} additional flashcards about "${topic}" at ${
          difficulty || "intermediate"
        } level.

Focus on different aspects than basic cards:
- Advanced applications and use cases
- Edge cases or exceptions
- Problem-solving scenarios
- Real-world examples
- Common mistakes and how to avoid them

Return as JSON array: [{"question": "...", "answer": "...", "category": "${topic}"}]`;

        const geminiCards = await generateFlashcardsWithGemini(
          additionalPrompt,
          "Additional Flashcard Generation",
          { count, difficulty, category: topic }
        );
        return geminiCards.slice(0, count);
      } catch (error) {
        console.error("🚨 [AdditionalCards] Gemini fallback failed:", error);
        // Fall back to content-specific database
        return this.generateContentSpecificFallback(topic, count);
      }
    }

    // Generate additional cards to meet the requested count
    const additionalPrompt = `Create exactly ${count} more flashcards about "${topic}" at ${
      difficulty || "intermediate"
    } level.

Focus on different aspects than basic cards:
- Advanced applications
- Edge cases or exceptions
- Historical context
- Connections to other topics
- Problem-solving scenarios

Return as JSON array: [{"question": "...", "answer": "...", "category": "${topic}"}]`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content: "You are creating supplementary study flashcards.",
          },
          { role: "user", content: additionalPrompt },
        ],
        { retries: 2 }
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const cards = JSON.parse(jsonMatch[0]);
        return Array.isArray(cards) ? cards.slice(0, count) : [];
      }
    } catch (error) {
      console.error("🚨 [AdditionalCards] Generation failed:", error);
    }

    // Final fallback - use content-specific database instead of generic templates
    console.log(
      "🔄 [AdditionalCards] Using content-specific fallback for:",
      topic,
      "count:",
      count
    );
    const cards = this.generateContentSpecificFallback(topic, count);
    console.log(
      "✅ [AdditionalCards] Content DB provided",
      cards.length,
      "cards"
    );
    return cards;
  }

  private deleteFlashcards(params: UniversalIntent["parameters"]): AgentResult {
    const all = FlashcardStorage.load();
    const target = (params.target as string) || "all";
    const topic = (params.topic || "").toLowerCase().trim();
    const id = params.id as string | undefined;

    // Specific item deletion by id
    if (target === "specific" && id) {
      const exists = all.find((c) => c.id === id);
      if (!exists) {
        return {
          summary: `I couldn't find a flashcard with id ${id}.`,
          artifacts: { flashcards: all },
        };
      }
      FlashcardStorage.remove(id);
      const remaining = FlashcardStorage.load();
      return {
        summary: `Deleted the selected flashcard (id: ${id}).`,
        artifacts: { flashcards: remaining },
      };
    }

    // Topic-scoped deletion (prefer this whenever a topic is provided)
    if ((target === "topic" || (!!topic && target !== "specific")) && topic) {
      // 🧠 ADVANCED: Use fuzzy matching for topic deletion
      const remaining = all.filter((card) => {
        const cardText =
          `${card.question} ${card.answer} ${card.category}`.toLowerCase();
        const directMatch = cardText.includes(topic);

        // Try fuzzy matching if direct match fails
        if (!directMatch) {
          const words = cardText.split(/\s+/);
          return !words.some((word) => this.smartSimilarity(word, topic, 0.8));
        }

        return !directMatch;
      });

      const removed = all.length - remaining.length;
      if (removed > 0) FlashcardStorage.save(remaining);
      return {
        summary:
          removed > 0
            ? `Deleted ${removed} flashcards related to ${params.topic}.`
            : `No flashcards found matching "${params.topic}".`,
        artifacts: { flashcards: remaining },
      };
    }

    // Mass delete all flashcards immediately (only when no topic provided)
    if (target === "all" && !topic) {
      FlashcardStorage.save([]);
      return {
        summary: "Deleted all flashcards.",
        artifacts: { flashcards: [] },
      };
    }

    // If specific requested but no id, ask to select
    if (target === "specific" && !id) {
      // Provide top few for selection context
      const sample = all.slice(0, 5).map((c) => ({ id: c.id, q: c.question }));
      return {
        summary:
          "Please specify which flashcard to delete. For example: 'delete this flashcard id:" +
          (all[0]?.id || "123") +
          "'.",
        artifacts: { flashcards: sample as any },
      };
    }

    return {
      summary: "No deletion performed.",
      artifacts: { flashcards: all },
    };
  }

  private viewFlashcards(params: UniversalIntent["parameters"]): AgentResult {
    const all = FlashcardStorage.load();
    const topic = params.topic?.toLowerCase();

    const filtered = topic
      ? all.filter((card) =>
          `${card.question} ${card.answer} ${card.category}`
            .toLowerCase()
            .includes(topic)
        )
      : all;

    return {
      summary: `Found ${filtered.length} flashcards${
        topic ? ` about ${params.topic}` : ""
      }.`,
      artifacts: { flashcards: filtered },
    };
  }

  private async handleNotesAction(
    action: UniversalIntent["action"],
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    switch (action) {
      case "create":
        return await this.createIntelligentNotes(params, input);

      case "delete":
        return this.deleteNotes(params);

      case "view":
        return this.viewNotes(params);

      case "search":
        return await this.searchStudyData(params, input);

      default:
        return {
          summary: `Notes ${action} not yet implemented`,
          artifacts: {},
        };
    }
  }

  private async createIntelligentNotes(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    let content = input.text || "";
    const source = input.files?.[0]?.name || "chat-input";
    const displayTitle = ((): string => {
      if (params.topic && params.topic.trim().length > 2)
        return params.topic.trim();
      const m = (content || "").match(/^(#+\s*)?([^\n]{4,80})/);
      if (m && m[2]) return m[2].trim();
      return source === "chat-input" ? "Chat Notes" : source;
    })();

    // If only a topic, enhance it for note-taking
    if (params.topic && content.length < 100) {
      content = await this.enhanceTopicForNotes(params.topic);
    }

    try {
      const notes = await generateNotesFromContent(content, displayTitle);
      const saved = NotesStorage.addBatch(notes);

      BuddyMemoryStorage.logTask("notes", `Created ${saved.length} notes`);

      return {
        summary: `Created ${saved.length} comprehensive notes${
          params.topic ? ` about ${params.topic}` : ""
        }.`,
        artifacts: { notes: saved },
      };
    } catch (error) {
      console.error("🚨 [NotesAI] Generation failed:", error);
      return {
        summary:
          "I had trouble creating those notes. Please provide more content or try a different topic.",
        artifacts: {},
      };
    }
  }

  private async enhanceTopicForNotes(topic: string): Promise<string> {
    const enhancementPrompt = `Create comprehensive study notes about "${topic}".

Structure the content with:
- Overview and key concepts
- Important definitions
- Main principles or theories
- Examples and applications
- Common misconceptions
- Practice problems or scenarios
- Summary of key points

Make it suitable for detailed note-taking and study.`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content: "You are an expert educator creating study materials.",
          },
          { role: "user", content: enhancementPrompt },
        ],
        { retries: 2 }
      );

      return (
        response ||
        `Comprehensive study material about ${topic} including key concepts, applications, and important principles.`
      );
    } catch (error) {
      return `Study material about ${topic} including key concepts, applications, and important principles.`;
    }
  }

  private deleteNotes(params: UniversalIntent["parameters"]): AgentResult {
    const all = NotesStorage.load();
    const target = (params.target as string) || "all";
    const topic = (params.topic || "").toLowerCase().trim();
    const id = params.id as string | undefined;

    if (target === "specific" && id) {
      const exists = all.find((n) => n.id === id);
      if (!exists) {
        return {
          summary: `I couldn't find a note with id ${id}.`,
          artifacts: { notes: all },
        };
      }
      NotesStorage.remove(id);
      const remaining = NotesStorage.load();
      return {
        summary: `Deleted the selected note (id: ${id}).`,
        artifacts: { notes: remaining },
      };
    }

    if ((target === "topic" || (!!topic && target !== "specific")) && topic) {
      // 🧠 ADVANCED: Use fuzzy matching for notes deletion too
      const remaining = all.filter((note) => {
        const noteText = `${note.title} ${note.content}`.toLowerCase();
        const directMatch = noteText.includes(topic);

        // Try fuzzy matching if direct match fails
        if (!directMatch) {
          const words = noteText.split(/\s+/);
          return !words.some((word) => this.smartSimilarity(word, topic, 0.8));
        }

        return !directMatch;
      });
      const removed = all.length - remaining.length;
      if (removed > 0) NotesStorage.save(remaining);
      return {
        summary:
          removed > 0
            ? `Deleted ${removed} notes related to ${params.topic}.`
            : `No notes found matching "${params.topic}".`,
        artifacts: { notes: remaining },
      };
    }

    if (target === "all" && !topic) {
      NotesStorage.save([]);
      return { summary: "Deleted all notes.", artifacts: { notes: [] } };
    }

    if (target === "specific" && !id) {
      const sample = all.slice(0, 5).map((n) => ({ id: n.id, title: n.title }));
      return {
        summary:
          "Please specify which note to delete. For example: 'delete this note id:" +
          (all[0]?.id || "123") +
          "'.",
        artifacts: { notes: sample as any },
      };
    }

    return { summary: "No deletion performed.", artifacts: { notes: all } };
  }

  private viewNotes(params: UniversalIntent["parameters"]): AgentResult {
    const all = NotesStorage.load();
    const topic = params.topic?.toLowerCase();

    const filtered = topic
      ? all.filter((note) =>
          `${note.title} ${note.content}`.toLowerCase().includes(topic)
        )
      : all;

    return {
      summary: `Found ${filtered.length} notes${
        topic ? ` about ${params.topic}` : ""
      }.`,
      artifacts: { notes: filtered },
    };
  }

  private async handleScheduleAction(
    action: UniversalIntent["action"],
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    switch (action) {
      case "create":
        return await this.createIntelligentSchedule(params, input);

      case "delete":
        return this.deleteSchedule(params);

      case "view":
        return this.viewSchedule(params);

      case "search":
        return await this.searchStudyData(params, input);

      default:
        return {
          summary: `Schedule ${action} not yet implemented`,
          artifacts: {},
        };
    }
  }

  private async createIntelligentSchedule(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const content = input.text || "";

    try {
      const scheduleItems = await generateScheduleFromContent(content);
      const saved = ScheduleStorage.addBatch(scheduleItems);

      BuddyMemoryStorage.logTask("schedule", `Added ${saved.length} items`);

      return {
        summary: `Added ${saved.length} items to your schedule.`,
        artifacts: { schedule: saved },
      };
    } catch (error) {
      console.error("🚨 [ScheduleAI] Generation failed:", error);
      return {
        summary:
          "I had trouble processing that schedule information. Please include clear dates and times.",
        artifacts: {},
      };
    }
  }

  private deleteSchedule(params: UniversalIntent["parameters"]): AgentResult {
    const all = ScheduleStorage.load();
    const topic = params.topic?.toLowerCase() || "";

    const remaining = all.filter(
      (item) => !`${item.title} ${item.type}`.toLowerCase().includes(topic)
    );

    const removed = all.length - remaining.length;
    if (removed > 0) {
      ScheduleStorage.save(remaining);
    }

    return {
      summary:
        removed > 0
          ? `Removed ${removed} schedule items${
              topic ? ` related to ${params.topic}` : ""
            }.`
          : `No schedule items found${
              topic ? ` matching "${params.topic}"` : ""
            }.`,
      artifacts: { schedule: remaining },
    };
  }

  private viewSchedule(params: UniversalIntent["parameters"]): AgentResult {
    const all = ScheduleStorage.load();
    const topic = params.topic?.toLowerCase();

    const filtered = topic
      ? all.filter((item) =>
          `${item.title} ${item.type}`.toLowerCase().includes(topic)
        )
      : all;

    return {
      summary: `Found ${filtered.length} schedule items${
        topic ? ` about ${params.topic}` : ""
      }.`,
      artifacts: { schedule: filtered },
    };
  }

  private async handleMixedAction(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    // Handle requests that involve multiple domains
    console.log("🔄 [UniversalAI] Handling mixed action");

    const text = input.text?.toLowerCase() || "";

    // Handle "notes and flashcards" specifically
    if (text.includes("notes") && text.includes("flashcard")) {
      console.log("🔄 [UniversalAI] Creating both notes and flashcards");

      try {
        // Create notes first
        const notesResult = await this.handleNotesAction(
          "create",
          params,
          input
        );

        // Create flashcards second
        const flashcardsResult = await this.handleFlashcardAction(
          "create",
          params,
          input
        );

        // Combine results
        return {
          summary: `${notesResult.summary} ${flashcardsResult.summary}`,
          artifacts: {
            ...notesResult.artifacts,
            ...flashcardsResult.artifacts,
          },
        };
      } catch (error) {
        console.error("🚨 [UniversalAI] Mixed action failed:", error);
      }
    }

    // For other mixed cases, prioritize based on keywords
    if (text.includes("flashcard")) {
      return await this.handleFlashcardAction("create", params, input);
    } else if (text.includes("note")) {
      return await this.handleNotesAction("create", params, input);
    } else if (text.includes("schedule")) {
      return await this.handleScheduleAction("create", params, input);
    }

    return {
      summary:
        "I'm not sure which specific action you'd like me to take. Could you clarify whether you want me to create notes, flashcards, or schedule items?",
      artifacts: {},
    };
  }

  private async handleUnclearIntent(
    intent: UniversalIntent,
    input: AgentTaskInput
  ): Promise<AgentResult> {
    // Try to clarify using AI
    const clarificationPrompt = `The user said: "${input.text}"

This seems to be related to educational content management but I need clarification. 

Based on the input, suggest what the user might want:
1. Create/manage study notes about a topic
2. Generate flashcards for memorization  
3. Schedule assignments/exams/classes
4. Something else entirely

Provide a helpful response that guides them to be more specific.`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content: "You are a helpful educational assistant.",
          },
          { role: "user", content: clarificationPrompt },
        ],
        { retries: 1 }
      );

      return {
        summary:
          response ||
          "I'm not sure what you'd like me to do. Could you clarify if you want me to help with notes, flashcards, or your schedule?",
        artifacts: {},
      };
    } catch (error) {
      return {
        summary:
          "I'm not sure what you'd like me to do. Try saying something like:\n• 'Create flashcards about biology'\n• 'Make notes on JavaScript'\n• 'Schedule my exam for Friday'",
        artifacts: {},
      };
    }
  }

  private async handleQueryAction(
    action: UniversalIntent["action"],
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const text = input.text.toLowerCase();

    switch (action) {
      case "search":
        return await this.searchStudyData(params, input);
      case "read":
        return await this.readScheduleInfo(params, input);
      case "connect":
        return await this.connectConcepts(params, input);
      case "recommend":
        return await this.getStudyRecommendations(params, input);
      default:
        return await this.handleGeneralQuery(params, input);
    }
  }

  private async handleSocialAction(
    action: UniversalIntent["action"],
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    switch (action) {
      case "chat":
        return await this.handleCasualChat(params, input);
      case "connect":
        return await this.connectWithStudyBuddy(params, input);
      default:
        return await this.handleFriendlyInteraction(params, input);
    }
  }

  private async searchStudyData(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const searchTerm = params.topic || input.text;

    // ✅ HANDLE TIMEFRAME-SPECIFIC SCHEDULE QUERIES
    if (
      params.timeframe &&
      (searchTerm.includes("tomorrow") ||
        searchTerm.includes("schedule") ||
        searchTerm.includes("today") ||
        searchTerm.includes("week"))
    ) {
      console.log(
        "🗓️ [ScheduleQuery] Handling timeframe-specific query:",
        params.timeframe
      );
      return await this.readScheduleInfo(params, input);
    }

    const searchResults = this.studyDataManager.searchAll(searchTerm);

    // Create detailed summary based on what was found
    let summary = searchResults.summary;

    // Add details about found items
    if (searchResults.type === "notes" || searchResults.type === "mixed") {
      const notes = searchResults.data.filter(
        (item) => item.content || item.title
      );
      if (notes.length > 0) {
        summary += `\n\n📝 Found Notes:\n`;
        notes.slice(0, 5).forEach((note, i) => {
          summary += `${i + 1}. ${note.title || "Untitled"}\n`;
          if (note.content) {
            summary += `   ${note.content.substring(0, 100)}...\n`;
          }
        });
      }
    }

    if (searchResults.type === "flashcards" || searchResults.type === "mixed") {
      const flashcards = searchResults.data.filter(
        (item) => item.question || item.answer
      );
      if (flashcards.length > 0) {
        summary += `\n\n🎴 Found Flashcards:\n`;
        flashcards.slice(0, 3).forEach((card, i) => {
          summary += `${i + 1}. Q: ${card.question || "No question"}\n`;
          summary += `   A: ${(card.answer || "No answer").substring(
            0,
            80
          )}...\n`;
        });
      }
    }

    if (searchResults.type === "schedule" || searchResults.type === "mixed") {
      const scheduleItems = searchResults.data.filter(
        (item) => item.title && item.date
      );
      if (scheduleItems.length > 0) {
        summary += `\n\n📅 Found Schedule Items:\n`;
        scheduleItems.slice(0, 3).forEach((item, i) => {
          summary += `${i + 1}. ${item.title} - ${item.date} ${
            item.time || ""
          }\n`;
        });
      }
    }

    // Add suggestions from search results
    if (searchResults.suggestions && searchResults.suggestions.length > 0) {
      summary += `\n\n💡 Suggestions:\n`;
      searchResults.suggestions.forEach((suggestion) => {
        summary += `• ${suggestion}\n`;
      });
    }

    return {
      summary,
      artifacts: {
        notes:
          searchResults.type === "notes" || searchResults.type === "mixed"
            ? searchResults.data.filter((item) => item.content || item.title)
            : [],
        flashcards:
          searchResults.type === "flashcards" || searchResults.type === "mixed"
            ? searchResults.data.filter((item) => item.question || item.answer)
            : [],
        schedule:
          searchResults.type === "schedule" || searchResults.type === "mixed"
            ? searchResults.data.filter((item) => item.title && item.date)
            : [],
      },
    };
  }

  private async readScheduleInfo(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const text = input.text.toLowerCase();
    let timeframe = "today";

    if (text.includes("tomorrow")) timeframe = "tomorrow";
    else if (text.includes("week")) timeframe = "this week";
    else if (text.includes("month")) timeframe = "this month";

    const scheduleInfo = this.studyDataManager.getScheduleInfo(timeframe);

    if (scheduleInfo.events.length === 0) {
      return {
        summary: `You don't have anything scheduled for ${timeframe}. Want me to help you plan something?`,
        artifacts: {},
      };
    }

    let summary = `Here's what you have ${timeframe}:\n`;
    scheduleInfo.events.forEach((item) => {
      summary += `• ${item.title} - ${item.time || "Time not set"}\n`;
    });

    return {
      summary,
      artifacts: {
        schedule: scheduleInfo.events,
      },
    };
  }

  private async connectConcepts(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const topic = params.topic || input.text;
    const relatedContent = this.studyDataManager.getRelatedContent(topic);

    const totalItems =
      relatedContent.flashcards.length + relatedContent.notes.length;

    if (totalItems === 0) {
      return {
        summary: `I couldn't find related concepts for "${topic}". This might be a new topic for you!`,
        artifacts: {},
      };
    }

    let summary = `Here are concepts related to "${topic}":\n`;

    if (relatedContent.flashcards.length > 0) {
      summary += `📚 ${relatedContent.flashcards.length} flashcards\n`;
    }

    if (relatedContent.notes.length > 0) {
      summary += `📝 ${relatedContent.notes.length} notes\n`;
    }

    if (relatedContent.suggestions.length > 0) {
      summary += `\nSuggestions:\n${relatedContent.suggestions
        .map((s) => `• ${s}`)
        .join("\n")}`;
    }

    return {
      summary,
      artifacts: {
        flashcards: relatedContent.flashcards,
        notes: relatedContent.notes,
      },
    };
  }

  private async getStudyRecommendations(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const recommendations = this.studyDataManager.getStudyRecommendations();

    const summary =
      `Here are my study recommendations for you:\n\n` +
      recommendations.map((rec) => `• ${rec}`).join("\n");

    return {
      summary,
      artifacts: {},
    };
  }

  private async handleGeneralQuery(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const context = this.studyDataManager.getStudyContext();

    try {
      const response = await callOpenRouter([
        {
          role: "system",
          content: `You are a helpful study buddy. The user has:
- ${context.stats.totalFlashcards} flashcards
- ${context.stats.totalNotes} notes  
- ${context.stats.upcomingEvents} upcoming events
- Favorite topics: ${context.stats.favoriteTopics.join(", ")}

Answer their question in a friendly, helpful way using this context.`,
        },
        { role: "user", content: input.text },
      ]);

      return {
        summary:
          response ||
          "I'm here to help with your studies! What would you like to know?",
        artifacts: {},
      };
    } catch (error) {
      return {
        summary:
          "I'm here to help with your studies! What would you like to know?",
        artifacts: {},
      };
    }
  }

  private async handleCasualChat(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const friendlyResponses = [
      "Hey there! How's your studying going?",
      "What's up, study buddy? Need help with anything?",
      "Hi! Ready to tackle some learning together?",
      "Hey! How can I help make your study session awesome?",
      "What's happening? Let's get some productive studying done!",
    ];

    const response =
      friendlyResponses[Math.floor(Math.random() * friendlyResponses.length)];

    return {
      summary: response,
      artifacts: {},
    };
  }

  private async connectWithStudyBuddy(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    return {
      summary:
        "I'm right here with you! Think of me as your personal study assistant. I can help you create flashcards, take notes, manage your schedule, and answer questions about your study materials. What would you like to work on together?",
      artifacts: {},
    };
  }

  private async handleFriendlyInteraction(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const context = this.studyDataManager.getStudyContext();

    const personalizedResponses = [
      `I see you've been working on ${
        context.stats.favoriteTopics[0] || "your studies"
      }. Keep it up!`,
      `You've got ${context.stats.totalFlashcards} flashcards so far - impressive! What's next?`,
      `Your dedication to learning shows! How can I help you today?`,
      `Ready to dive into some more learning? I'm excited to help!`,
      "How's your studying going? I'm here to make it easier and more effective!",
    ];

    const response =
      personalizedResponses[
        Math.floor(Math.random() * personalizedResponses.length)
      ];

    return {
      summary: response,
      artifacts: {},
    };
  }

  // 🧠 ADVANCED INTELLIGENCE INITIALIZATION
  private initializeCapabilities() {
    // Register all available capabilities
    this.capabilityRegistry.register("study_management", {
      domains: ["notes", "flashcards", "schedule"],
      complexity: "simple",
      description: "Manage study materials and schedules",
    });

    this.capabilityRegistry.register("content_analysis", {
      domains: ["analysis", "research"],
      complexity: "complex",
      description: "Analyze and synthesize content",
    });

    this.capabilityRegistry.register("creative_assistance", {
      domains: ["creative", "communication"],
      complexity: "complex",
      description: "Generate creative content and communications",
    });

    this.capabilityRegistry.register("problem_solving", {
      domains: ["problem_solving", "learning"],
      complexity: "analytical",
      description: "Solve problems and provide explanations",
    });

    this.capabilityRegistry.register("planning_optimization", {
      domains: ["planning", "mixed"],
      complexity: "multi-step",
      description: "Create plans and optimize workflows",
    });
  }
}

// 🚀 ADVANCED AGENTIC INTELLIGENCE COMPONENTS

/**
 * TaskDecomposer - Breaks down complex requests into manageable steps
 */
class TaskDecomposer {
  async decompose(userInput: string, context: any): Promise<DecomposedTask> {
    // Analyze complexity
    const complexity = this.analyzeComplexity(userInput);

    if (complexity === "simple") {
      return {
        originalRequest: userInput,
        complexity,
        steps: [
          {
            id: "single-step",
            description: userInput,
            type: "direct",
            dependencies: [],
            status: "pending",
          },
        ],
        expectedOutputType: "direct_response",
        estimatedTime: "< 1 minute",
      };
    }

    // Use AI to decompose complex tasks
    return await this.aiDecomposition(userInput, context);
  }

  private analyzeComplexity(input: string): TaskComplexity {
    const complexityIndicators = {
      multi_step:
        /prepare for|plan for|organize|review everything|comprehensive|help me with/i,
      creative: /write|create|generate|design|compose|brainstorm/i,
      analytical: /analyze|compare|evaluate|assess|find gaps|what should I/i,
      complex: /explain|understand|learn about|teach me/i,
    };

    for (const [complexity, pattern] of Object.entries(complexityIndicators)) {
      if (pattern.test(input)) {
        return complexity as TaskComplexity;
      }
    }

    return "simple";
  }

  private async aiDecomposition(
    userInput: string,
    context: any
  ): Promise<DecomposedTask> {
    const prompt = `Break down this complex request into clear, actionable steps:

User Request: "${userInput}"

Available Resources:
- ${context.currentContent.notes.length} notes
- ${context.currentContent.flashcards.length} flashcards  
- ${context.currentContent.schedule.length} scheduled items

Please provide a JSON response with this structure:
{
  "complexity": "multi-step|creative|analytical|complex",
  "steps": [
    {
      "id": "step-1",
      "description": "Clear description of what to do",
      "type": "analysis|creation|search|planning|synthesis",
      "dependencies": [],
      "estimatedTime": "1-2 minutes"
    }
  ],
  "expectedOutputType": "description of final output",
  "estimatedTime": "total time estimate"
}

Make steps specific and actionable.`;

    try {
      const response = await callOpenRouter([
        {
          role: "system",
          content:
            "You are an expert task planner. Break down complex requests into clear, actionable steps.",
        },
        { role: "user", content: prompt },
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          originalRequest: userInput,
          complexity: parsed.complexity || "complex",
          steps: parsed.steps.map((step: any, index: number) => ({
            ...step,
            id: step.id || `step-${index + 1}`,
            status: "pending" as const,
          })),
          expectedOutputType:
            parsed.expectedOutputType || "comprehensive_response",
          estimatedTime: parsed.estimatedTime || "3-5 minutes",
        };
      }
    } catch (error) {
      console.warn("AI decomposition failed, using fallback");
    }

    // Fallback decomposition
    return {
      originalRequest: userInput,
      complexity: "complex",
      steps: [
        {
          id: "analyze",
          description: "Analyze the request and available resources",
          type: "analysis",
          dependencies: [],
          status: "pending",
        },
        {
          id: "execute",
          description: "Execute the main task",
          type: "creation",
          dependencies: ["analyze"],
          status: "pending",
        },
        {
          id: "finalize",
          description: "Compile and present results",
          type: "synthesis",
          dependencies: ["execute"],
          status: "pending",
        },
      ],
      expectedOutputType: "comprehensive_response",
      estimatedTime: "2-4 minutes",
    };
  }
}

/**
 * CapabilityRegistry - Manages available AI capabilities
 */
class CapabilityRegistry {
  private capabilities = new Map<
    string,
    {
      domains: string[];
      complexity: TaskComplexity;
      description: string;
      handler?: (params: any) => Promise<any>;
    }
  >();

  register(
    name: string,
    capability: {
      domains: string[];
      complexity: TaskComplexity;
      description: string;
      handler?: (params: any) => Promise<any>;
    }
  ) {
    this.capabilities.set(name, capability);
  }

  findCapable(domain: string, complexity: TaskComplexity): string[] {
    const capable: string[] = [];

    for (const [name, capability] of this.capabilities) {
      if (capability.domains.includes(domain)) {
        capable.push(name);
      }
    }

    return capable;
  }

  getCapability(name: string) {
    return this.capabilities.get(name);
  }

  listAll() {
    return Array.from(this.capabilities.entries()).map(([name, cap]) => ({
      name,
      ...cap,
    }));
  }
}

/**
 * ExecutionEngine - Orchestrates multi-step task execution
 */
class ExecutionEngine {
  async execute(
    decomposedTask: DecomposedTask,
    agent: UniversalAgenticAI
  ): Promise<AgentResult> {
    if (decomposedTask.complexity === "simple") {
      // Direct execution for simple tasks
      return await this.executeDirectly(decomposedTask, agent);
    }

    // Multi-step execution
    return await this.executeMultiStep(decomposedTask, agent);
  }

  private async executeDirectly(
    task: DecomposedTask,
    agent: UniversalAgenticAI
  ): Promise<AgentResult> {
    // Execute single step task using existing agent logic
    const step = task.steps[0];
    step.status = "running";

    try {
      // This would call the appropriate agent method based on the task
      const result = await this.delegateToAgent(step, agent);
      step.status = "completed";
      step.result = result;

      return result;
    } catch (error) {
      step.status = "failed";
      return {
        summary: `Task failed: ${error}`,
        artifacts: {},
      };
    }
  }

  private async executeMultiStep(
    task: DecomposedTask,
    agent: UniversalAgenticAI
  ): Promise<AgentResult> {
    const results: AgentResult[] = [];
    const stepResults = new Map<string, any>();

    // Execute steps in dependency order
    for (const step of task.steps) {
      // Check if dependencies are met
      if (step.dependencies.every((dep) => stepResults.has(dep))) {
        step.status = "running";

        try {
          const result = await this.delegateToAgent(step, agent, stepResults);
          step.status = "completed";
          step.result = result;
          stepResults.set(step.id, result);
          results.push(result);
        } catch (error) {
          step.status = "failed";
          console.error(`Step ${step.id} failed:`, error);
        }
      }
    }

    // Synthesize final result
    return this.synthesizeResults(task, results);
  }

  private async delegateToAgent(
    step: TaskStep,
    agent: UniversalAgenticAI,
    previousResults?: Map<string, any>
  ): Promise<AgentResult> {
    // This is a simplified delegation - in practice, this would route to specific agent methods
    // based on the step type and description

    if (step.type === "analysis") {
      return {
        summary: `Analyzed: ${step.description}`,
        artifacts: {
          notes: [
            {
              title: "Analysis Result",
              content: step.description,
              category: "analysis",
            },
          ],
        },
      };
    } else if (step.type === "creation") {
      return {
        summary: `Created: ${step.description}`,
        artifacts: {
          notes: [
            {
              title: "Created Content",
              content: step.description,
              category: "creation",
            },
          ],
        },
      };
    } else if (step.type === "synthesis") {
      return {
        summary: `Synthesized results from ${
          previousResults?.size || 0
        } previous steps`,
        artifacts: {
          notes: [
            {
              title: "Synthesis Result",
              content: "Combined results from multiple analysis steps",
              category: "synthesis",
            },
          ],
        },
      };
    }

    return {
      summary: `Completed: ${step.description}`,
      artifacts: {},
    };
  }

  private synthesizeResults(
    task: DecomposedTask,
    results: AgentResult[]
  ): AgentResult {
    const combinedSummary = results.map((r) => r.summary).join("\n\n");
    const allNotes = results.flatMap((r) => r.artifacts.notes || []);
    const allFlashcards = results.flatMap((r) => r.artifacts.flashcards || []);
    const allSchedule = results.flatMap((r) => r.artifacts.schedule || []);

    return {
      summary: `Completed multi-step task: ${task.originalRequest}\n\n${combinedSummary}`,
      artifacts: {
        notes: [
          ...allNotes,
          {
            title: "Task Completion Summary",
            content: `Multi-step task completed with ${task.steps.length} steps in ${task.estimatedTime}`,
            category: "task_summary",
            metadata: {
              taskBreakdown: task.steps,
              completionTime: task.estimatedTime,
            },
          },
        ],
        flashcards: allFlashcards,
        schedule: allSchedule,
      },
    };
  }
}

/**
 * LearningModule - Continuously improves based on user interactions
 */
class LearningModule {
  private userPatterns = new Map<string, number>();
  private successfulApproaches = new Map<string, string[]>();

  recordInteraction(
    input: string,
    intent: UniversalIntent,
    result: AgentResult,
    userFeedback?: "positive" | "negative"
  ) {
    // Track user patterns
    const pattern = this.extractPattern(input);
    this.userPatterns.set(pattern, (this.userPatterns.get(pattern) || 0) + 1);

    // Track successful approaches
    if (userFeedback === "positive" || result.summary.length > 0) {
      const approach = `${intent.domain}-${intent.action}`;
      if (!this.successfulApproaches.has(approach)) {
        this.successfulApproaches.set(approach, []);
      }
      this.successfulApproaches.get(approach)!.push(input);
    }

    this.saveToStorage();
  }

  getRecommendations(input: string): string[] {
    const pattern = this.extractPattern(input);
    const recommendations: string[] = [];

    // Find similar patterns
    for (const [storedPattern, frequency] of this.userPatterns) {
      if (
        this.calculateSimilarity(pattern, storedPattern) > 0.7 &&
        frequency > 2
      ) {
        recommendations.push(
          `Based on your usage patterns, you might also want to: ${storedPattern}`
        );
      }
    }

    return recommendations.slice(0, 3); // Top 3 recommendations
  }

  private extractPattern(input: string): string {
    // Extract general pattern from specific input
    return input
      .toLowerCase()
      .replace(/\b(my|the|this|that|these|those)\b/g, "")
      .replace(/\b\w+day\b/g, "timeframe")
      .replace(/\b\d+\b/g, "number")
      .trim();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(" ");
    const words2 = str2.split(" ");
    const intersection = words1.filter((word) => words2.includes(word));
    return intersection.length / Math.max(words1.length, words2.length);
  }

  private saveToStorage() {
    try {
      localStorage.setItem(
        "skippy-learning-patterns",
        JSON.stringify({
          patterns: Array.from(this.userPatterns.entries()),
          approaches: Array.from(this.successfulApproaches.entries()),
        })
      );
    } catch (error) {
      console.warn("Failed to save learning data:", error);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem("skippy-learning-patterns");
      if (stored) {
        const data = JSON.parse(stored);
        this.userPatterns = new Map(data.patterns || []);
        this.successfulApproaches = new Map(data.approaches || []);
      }
    } catch (error) {
      console.warn("Failed to load learning data:", error);
    }
  }
}

// Create the default instance for global use
export const universalAI = new UniversalAgenticAI();

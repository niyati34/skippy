// Advanced Task Analyzer - Unlimited task understanding and execution
// Uses sophisticated AI reasoning to handle any study-related request

import { callGemini } from "../services/geminiAI";
import * as chrono from "chrono-node";

export interface AdvancedTaskAction {
  type: string; // Not limited to predefined types
  target: string; // Not limited to predefined targets
  priority: "urgent" | "high" | "medium" | "low";
  data: any; // Flexible data structure
  complexity: number; // 1-10 scale
  dependencies?: string[]; // Other actions this depends on
  metadata?: {
    estimatedTime?: string;
    difficulty?: string;
    tools?: string[];
    skills?: string[];
    alignedObjectives?: string[];
    personalizedApproach?: string;
    [key: string]: any; // Allow additional properties
  };
}

export interface AdvancedTaskRequest {
  actions: AdvancedTaskAction[];
  message: string;
  confidence: number;
  reasoning: string;
  context?: any;
  suggestions?: string[];
}

export class AdvancedTaskAnalyzer {
  private static readonly ADVANCED_CAPABILITIES = [
    // Core Study Operations
    "create",
    "delete",
    "update",
    "search",
    "analyze",
    "convert",
    "organize",

    // Advanced Learning Operations
    "summarize",
    "explain",
    "practice",
    "quiz",
    "review",
    "roadmap",
    "visualize",
    "memorize",
    "connect",

    // Content Processing
    "extract",
    "transform",
    "merge",
    "split",
    "categorize",
    "tag",
    "filter",

    // Scheduling & Planning
    "schedule",
    "plan",
    "remind",
    "track",
    "monitor",
    "optimize",
    "adjust",

    // Advanced AI Operations
    "generate",
    "enhance",
    "critique",
    "evaluate",
    "compare",
    "rank",
    "recommend",

    // Research & Learning
    "research",
    "investigate",
    "explore",
    "discover",
    "validate",
    "verify",
    "cite",

    // Collaboration & Sharing
    "share",
    "export",
    "import",
    "sync",
    "backup",
    "restore",
    "publish",

    // Metacognitive Operations
    "reflect",
    "assess",
    "diagnose",
    "adapt",
    "personalize",
    "strategize",
  ];

  private static readonly ADVANCED_TARGETS = [
    // Traditional
    "notes",
    "flashcards",
    "schedule",
    "content",
    "files",

    // Advanced Learning Materials
    "concepts",
    "topics",
    "subjects",
    "courses",
    "curricula",
    "lessons",
    "exercises",
    "problems",
    "solutions",
    "examples",
    "case-studies",

    // Knowledge Structures
    "knowledge-base",
    "mind-maps",
    "concept-maps",
    "hierarchies",
    "networks",
    "relationships",
    "connections",
    "patterns",
    "frameworks",

    // Study Tools
    "study-plans",
    "learning-paths",
    "progress",
    "goals",
    "milestones",
    "assessments",
    "evaluations",
    "feedback",
    "insights",
    "analytics",

    // Resources
    "references",
    "sources",
    "citations",
    "bibliography",
    "research",
    "datasets",
    "experiments",
    "simulations",
    "models",
    "visualizations",

    // Personal Learning
    "preferences",
    "strengths",
    "weaknesses",
    "learning-style",
    "habits",
    "motivation",
    "emotions",
    "stress",
    "time-management",
    "focus",
  ];

  /**
   * Advanced task understanding using multi-stage AI analysis
   */
  static async understandAdvancedRequest(
    userInput: string,
    context?: any
  ): Promise<AdvancedTaskRequest> {
    console.log(`🧠 [AdvancedTaskAnalyzer] Analyzing: "${userInput}"`);

    try {
      // Stage 1: Intent Classification and Complexity Analysis
      const analysis = await this.performDeepAnalysis(userInput, context);

      // Stage 2: Task Decomposition
      const actions = await this.decomposeIntoActions(
        userInput,
        analysis,
        context
      );

      // Stage 3: Optimization and Dependency Resolution
      const optimizedActions = await this.optimizeAndResolve(actions, analysis);

      return {
        actions: optimizedActions,
        message: analysis.message,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        context: analysis.context,
        suggestions: analysis.suggestions,
      };
    } catch (error) {
      console.error("❌ [AdvancedTaskAnalyzer] Analysis failed:", error);

      // Fallback to basic understanding
      return this.fallbackAnalysis(userInput);
    }
  }

  /**
   * Deep AI analysis of user intent and context
   */
  private static async performDeepAnalysis(
    userInput: string,
    context?: any
  ): Promise<any> {
    const analysisPrompt = `You are an advanced learning assistant with deep understanding of educational psychology, cognitive science, and study methodologies. Analyze this user request comprehensively.

User Input: "${userInput}"
Context: ${JSON.stringify(context || {})}

Provide a detailed analysis including:
1. Primary intent and goals
2. Complexity level (1-10)
3. Required capabilities and tools
4. Optimal approach strategy
5. Potential challenges or ambiguities
6. Learning objectives alignment
7. Suggested improvements or alternatives

Available Capabilities: ${this.ADVANCED_CAPABILITIES.join(", ")}
Available Targets: ${this.ADVANCED_TARGETS.join(", ")}

Return a JSON object with your analysis:`;

    const messages = [
      { role: "system", content: analysisPrompt },
      { role: "user", content: userInput },
    ];

    try {
      const response = await callGemini(messages, {
        temperature: 0.3,
        maxTokens: 1000,
        responseMimeType: "application/json",
      });

      return JSON.parse(response);
    } catch (error) {
      console.error("Analysis failed:", error);
      return this.createBasicAnalysis(userInput);
    }
  }

  /**
   * Decompose complex requests into atomic actions
   */
  private static async decomposeIntoActions(
    userInput: string,
    analysis: any,
    context?: any
  ): Promise<AdvancedTaskAction[]> {
    const decompositionPrompt = `Based on the analysis, decompose this request into specific, executable actions.

User Input: "${userInput}"
Analysis: ${JSON.stringify(analysis)}

Create a sequence of actions that will fulfill the user's request. Each action should be atomic and executable.

For each action, specify:
- type: The operation to perform
- target: What to operate on
- priority: urgency level
- data: Specific parameters and details
- complexity: 1-10 scale
- dependencies: Other actions this depends on
- metadata: Additional information

Available Operations: ${this.ADVANCED_CAPABILITIES.join(", ")}
Available Targets: ${this.ADVANCED_TARGETS.join(", ")}

Return a JSON array of actions:`;

    const messages = [
      { role: "system", content: decompositionPrompt },
      { role: "user", content: JSON.stringify({ input: userInput, analysis }) },
    ];

    try {
      const response = await callGemini(messages, {
        temperature: 0.2,
        maxTokens: 1500,
        responseMimeType: "application/json",
      });

      const rawActions = JSON.parse(response);
      let actions = rawActions.map((action: any, index: number) =>
        this.validateAndEnhanceAction(action, index)
      );

      // Heuristic post-processing: elevate roadmap intents
      const lowerInput = userInput.toLowerCase();
      const isRoadmapIntent =
        /visual\s+roadmap|learning\s+path|study\s+plan|roadmap\s+for/.test(
          lowerInput
        ) ||
        (lowerInput.startsWith("create") && lowerInput.includes("roadmap"));

      if (isRoadmapIntent) {
        const hasRoadmap = actions.some(
          (a) => a.type === "roadmap" || a.target === "roadmap"
        );
        if (!hasRoadmap) {
          // Transform first create/content action into roadmap action
          const createIdx = actions.findIndex((a) => a.type === "create");
          if (createIdx !== -1) {
            actions[createIdx].type = "roadmap";
            actions[createIdx].target = "learning-path";
            actions[createIdx].data = {
              topic: userInput
                .replace(/create|visual|roadmap|for/gi, " ")
                .trim(),
              sourceText: userInput,
              style: lowerInput.includes("visual") ? "visual" : "standard",
            };
            actions[createIdx].metadata = {
              ...(actions[createIdx].metadata || {}),
              difficulty: analysis?.context?.difficulty || "mixed",
              estimatedTime: "15-30 minutes",
              tools: [
                ...new Set([
                  ...(actions[createIdx].metadata?.tools || []),
                  "visual-roadmap",
                ]),
              ],
            };
          } else {
            actions.unshift({
              type: "roadmap",
              target: "learning-path",
              priority: "medium",
              data: {
                topic: userInput.replace(/roadmap|create|for/gi, " ").trim(),
                sourceText: userInput,
              },
              complexity: Math.max(3, Math.min(9, analysis?.complexity || 5)),
              dependencies: [],
              metadata: {
                estimatedTime: "15-30 minutes",
                difficulty: "mixed",
                tools: ["visual-roadmap"],
              },
            });
          }
        }
      }
      return actions;
    } catch (error) {
      console.error("Decomposition failed:", error);
      return this.createBasicActions(userInput);
    }
  }

  /**
   * Optimize action sequence and resolve dependencies
   */
  private static async optimizeAndResolve(
    actions: AdvancedTaskAction[],
    analysis: any
  ): Promise<AdvancedTaskAction[]> {
    // Sort by dependencies and priority
    const sortedActions = this.topologicalSort(actions);

    // Optimize for efficiency
    const optimizedActions = this.optimizeSequence(sortedActions);

    // Add smart defaults and enhancements
    return optimizedActions.map((action) =>
      this.enhanceAction(action, analysis)
    );
  }

  /**
   * Validate and enhance individual actions
   */
  private static validateAndEnhanceAction(
    action: any,
    index: number
  ): AdvancedTaskAction {
    // Ensure required fields
    const validAction: AdvancedTaskAction = {
      type: action.type || "process",
      target: action.target || "content",
      priority: action.priority || "medium",
      data: action.data || {},
      complexity: Math.max(1, Math.min(10, action.complexity || 5)),
      dependencies: action.dependencies || [],
      metadata: {
        estimatedTime: action.metadata?.estimatedTime || "2-5 minutes",
        difficulty: action.metadata?.difficulty || "moderate",
        tools: action.metadata?.tools || [],
        skills: action.metadata?.skills || [],
        ...action.metadata,
      },
    };

    // Add intelligent defaults based on type
    this.addIntelligentDefaults(validAction);

    // Add time parsing for schedule-related actions
    if (validAction.type === "schedule" && validAction.data.timeString) {
      const parsedTime = chrono.parseDate(validAction.data.timeString);
      if (parsedTime) {
        validAction.data.dateTime = parsedTime;
      }
    }

    return validAction;
  }

  /**
   * Add intelligent defaults based on action type
   */
  private static addIntelligentDefaults(action: AdvancedTaskAction): void {
    const defaults: Record<string, any> = {
      create: {
        metadata: {
          tools: ["ai-generation", "templates"],
          skills: ["content-creation"],
        },
      },
      summarize: {
        metadata: {
          tools: ["ai-analysis", "extraction"],
          skills: ["synthesis"],
        },
      },
      analyze: {
        metadata: {
          tools: ["ai-analysis", "pattern-recognition"],
          skills: ["critical-thinking"],
        },
      },
      practice: {
        metadata: {
          tools: ["spaced-repetition", "active-recall"],
          skills: ["memory"],
        },
      },
      research: {
        metadata: {
          tools: ["search", "validation"],
          skills: ["information-literacy"],
        },
      },
    };

    const typeDefaults = defaults[action.type];
    if (typeDefaults) {
      action.metadata = { ...typeDefaults.metadata, ...action.metadata };
    }
  }

  /**
   * Topological sort for dependency resolution
   */
  private static topologicalSort(
    actions: AdvancedTaskAction[]
  ): AdvancedTaskAction[] {
    const visited = new Set<number>();
    const visiting = new Set<number>();
    const result: AdvancedTaskAction[] = [];

    const visit = (index: number) => {
      if (visiting.has(index)) {
        console.warn("Circular dependency detected, breaking cycle");
        return;
      }
      if (visited.has(index)) return;

      visiting.add(index);

      // Visit dependencies first
      const action = actions[index];
      if (action.dependencies) {
        action.dependencies.forEach((depId) => {
          const depIndex = actions.findIndex((a) => (a as any).id === depId);
          if (depIndex !== -1) visit(depIndex);
        });
      }

      visiting.delete(index);
      visited.add(index);
      result.push(action);
    };

    for (let i = 0; i < actions.length; i++) {
      visit(i);
    }

    return result;
  }

  /**
   * Optimize action sequence for efficiency
   */
  private static optimizeSequence(
    actions: AdvancedTaskAction[]
  ): AdvancedTaskAction[] {
    // Group similar operations
    const grouped = this.groupSimilarActions(actions);

    // Prioritize high-impact, low-effort actions
    const prioritized = grouped.sort((a, b) => {
      const scoreA = this.calculateActionScore(a);
      const scoreB = this.calculateActionScore(b);
      return scoreB - scoreA;
    });

    return prioritized;
  }

  /**
   * Group similar actions for batch processing
   */
  private static groupSimilarActions(
    actions: AdvancedTaskAction[]
  ): AdvancedTaskAction[] {
    // For now, return as-is. Future enhancement: batch similar operations
    return actions;
  }

  /**
   * Calculate action priority score
   */
  private static calculateActionScore(action: AdvancedTaskAction): number {
    const priorityWeights = { urgent: 10, high: 7, medium: 5, low: 2 };
    const priorityScore = priorityWeights[action.priority] || 5;
    const complexityPenalty = action.complexity * 0.5;

    return priorityScore - complexityPenalty;
  }

  /**
   * Enhance action with additional intelligence
   */
  private static enhanceAction(
    action: AdvancedTaskAction,
    analysis: any
  ): AdvancedTaskAction {
    // Add context-aware enhancements
    if (analysis.learningObjectives) {
      action.metadata = {
        ...action.metadata,
        alignedObjectives: analysis.learningObjectives,
      };
    }

    // Add personalization hints
    if (analysis.learningStyle) {
      action.metadata = {
        ...action.metadata,
        personalizedApproach: analysis.learningStyle,
      };
    }

    return action;
  }

  /**
   * Fallback analysis for when AI fails
   */
  private static fallbackAnalysis(userInput: string): AdvancedTaskRequest {
    console.log("🔄 [AdvancedTaskAnalyzer] Using fallback analysis");

    return {
      actions: this.createBasicActions(userInput),
      message: "Using basic analysis due to AI unavailability",
      confidence: 0.6,
      reasoning: "Fallback to rule-based parsing",
      suggestions: ["Try rephrasing your request for better understanding"],
    };
  }

  /**
   * Create basic analysis when AI fails
   */
  private static createBasicAnalysis(userInput: string): any {
    return {
      intent: "general-request",
      complexity: 5,
      confidence: 0.6,
      message: "Basic analysis completed",
      reasoning: "Using rule-based fallback",
    };
  }

  /**
   * Create basic actions when AI fails
   */
  private static createBasicActions(userInput: string): AdvancedTaskAction[] {
    // Simple keyword-based action creation
    const actions: AdvancedTaskAction[] = [];

    if (/create|make|generate/i.test(userInput)) {
      actions.push({
        type: "create",
        target: this.inferTarget(userInput),
        priority: "medium",
        data: { topic: this.extractTopic(userInput) },
        complexity: 5,
      });
    }

    if (/delete|remove|clear/i.test(userInput)) {
      actions.push({
        type: "delete",
        target: this.inferTarget(userInput),
        priority: "medium",
        data: { topic: this.extractTopic(userInput) },
        complexity: 3,
      });
    }

    return actions.length > 0
      ? actions
      : [
          {
            type: "process",
            target: "content",
            priority: "medium",
            data: { input: userInput },
            complexity: 5,
          },
        ];
  }

  /**
   * Infer target from user input
   */
  private static inferTarget(userInput: string): string {
    const input = userInput.toLowerCase();

    if (/flashcard|card/i.test(input)) return "flashcards";
    if (/note|notebook/i.test(input)) return "notes";
    if (/schedule|calendar|plan/i.test(input)) return "schedule";
    if (/concept|idea/i.test(input)) return "concepts";
    if (/topic|subject/i.test(input)) return "topics";

    return "content";
  }

  /**
   * Extract topic from user input
   */
  private static extractTopic(userInput: string): string {
    // Simple topic extraction - can be enhanced
    const aboutMatch = userInput.match(/(?:about|on|for|of)\s+([^,.;]+)/i);
    if (aboutMatch) return aboutMatch[1].trim();

    // Remove action words and return remainder
    const cleaned = userInput
      .replace(
        /(create|make|generate|delete|remove|clear|flashcard|note|schedule)/gi,
        ""
      )
      .trim();

    return cleaned || "general";
  }
}

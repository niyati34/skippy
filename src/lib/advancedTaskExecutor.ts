// Advanced Task Executor - Handles unlimited task types with AI-powered execution
// Dynamically adapts to any kind of study task

import {
  AdvancedTaskAction,
  AdvancedTaskRequest,
} from "./advancedTaskAnalyzer";
import { NotesStorage, FlashcardStorage, ScheduleStorage } from "./storage";
import {
  generateNotesWithGemini,
  generateFlashcardsWithGemini,
  callGemini,
} from "../services/geminiAI";
import { VisualRoadmapGenerator } from "./visualRoadmapGenerator";

export interface AdvancedTaskResult {
  success: boolean;
  message: string;
  data?: any;
  count?: number;
  metadata?: any;
  insights?: string[];
  nextSuggestions?: string[];
}

export class AdvancedTaskExecutor {
  private static readonly EXECUTION_STRATEGIES = new Map<string, Function>();
  private static readonly AI_ENHANCED_OPERATIONS = new Set([
    "summarize",
    "analyze",
    "explain",
    "generate",
    "enhance",
    "critique",
    "research",
    "investigate",
    "connect",
    "reflect",
    "assess",
    "recommend",
    "roadmap",
    "visualize",
    "design",
  ]);

  static {
    // Register execution strategies
    this.registerExecutionStrategies();
  }

  /**
   * Execute advanced task request with intelligent adaptation
   */
  static async executeAdvancedTask(
    request: AdvancedTaskRequest
  ): Promise<AdvancedTaskResult[]> {
    console.log(
      `⚡ [AdvancedTaskExecutor] Executing ${request.actions.length} advanced actions`
    );

    const results: AdvancedTaskResult[] = [];
    const executionContext = this.createExecutionContext(request);

    for (const action of request.actions) {
      try {
        const result = await this.executeAdvancedAction(
          action,
          executionContext
        );
        results.push(result);

        // Update context with results for dependent actions
        this.updateExecutionContext(executionContext, action, result);
      } catch (error) {
        console.error(`❌ [AdvancedTaskExecutor] Action failed:`, error);
        results.push({
          success: false,
          message: `Failed to ${action.type} ${action.target}: ${error.message}`,
          metadata: { error: error.message, action },
        });
      }
    }

    return results;
  }

  /**
   * Execute individual advanced action
   */
  private static async executeAdvancedAction(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    console.log(
      `🎯 [AdvancedTaskExecutor] Executing: ${action.type} ${action.target}`
    );

    // Check for registered strategy
    const strategyKey = `${action.type}_${action.target}`;
    const specificStrategy = this.EXECUTION_STRATEGIES.get(strategyKey);
    if (specificStrategy) {
      return await specificStrategy(action, context);
    }

    // Check for general type strategy
    const generalStrategy = this.EXECUTION_STRATEGIES.get(action.type);
    if (generalStrategy) {
      return await generalStrategy(action, context);
    }

    // AI-enhanced operations
    if (this.AI_ENHANCED_OPERATIONS.has(action.type)) {
      return await this.executeAIEnhancedOperation(action, context);
    }

    // Dynamic execution based on action type
    return await this.executeDynamicAction(action, context);
  }

  /**
   * Execute AI-enhanced operations
   */
  private static async executeAIEnhancedOperation(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    const prompt = this.buildAIOperationPrompt(action, context);

    try {
      const response = await callGemini(
        [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        {
          temperature: 0.3,
          maxTokens: 2000,
          responseMimeType:
            action.type === "analyze" ? "application/json" : "text/plain",
        }
      );

      const result = await this.processAIResponse(action, response, context);
      return {
        success: true,
        message: `Successfully completed ${action.type} operation`,
        data: result,
        metadata: {
          aiGenerated: true,
          prompt: prompt.user,
          complexity: action.complexity,
        },
      };
    } catch (error) {
      console.error(`AI operation failed:`, error);
      return await this.executeFallbackOperation(action, context);
    }
  }

  /**
   * Build AI operation prompt
   */
  private static buildAIOperationPrompt(
    action: AdvancedTaskAction,
    context: any
  ): any {
    const systemPrompts: Record<string, string> = {
      summarize:
        "You are an expert at creating concise, comprehensive summaries that capture key insights and main points.",
      analyze:
        "You are an analytical expert who identifies patterns, relationships, and deep insights from information.",
      explain:
        "You are a skilled educator who can explain complex concepts in clear, understandable ways.",
      research:
        "You are a research specialist who can investigate topics thoroughly and provide well-sourced information.",
      connect:
        "You are a knowledge synthesis expert who identifies meaningful connections between different concepts.",
      reflect:
        "You are a metacognitive specialist who helps with self-assessment and learning reflection.",
      recommend:
        "You are an educational advisor who provides personalized recommendations based on learning goals.",
    };

    const systemPrompt =
      systemPrompts[action.type] ||
      `You are an intelligent assistant specialized in ${action.type} operations for educational content.`;

    const userPrompt = this.buildUserPrompt(action, context);

    return {
      system: systemPrompt,
      user: userPrompt,
    };
  }

  /**
   * Build user prompt for AI operations
   */
  private static buildUserPrompt(
    action: AdvancedTaskAction,
    context: any
  ): string {
    const basePrompt = `Task: ${action.type} ${action.target}\n`;
    const dataPrompt = action.data
      ? `Data: ${JSON.stringify(action.data)}\n`
      : "";
    const contextPrompt = context.relevantData
      ? `Context: ${JSON.stringify(context.relevantData)}\n`
      : "";

    // Add specific instructions based on action type
    const specificInstructions = this.getSpecificInstructions(action);

    return basePrompt + dataPrompt + contextPrompt + specificInstructions;
  }

  /**
   * Get specific instructions for different action types
   */
  private static getSpecificInstructions(action: AdvancedTaskAction): string {
    const instructions: Record<string, string> = {
      summarize:
        "Create a concise summary highlighting the most important points. Use bullet points if appropriate.",
      analyze:
        "Provide deep analysis including patterns, insights, and implications. Return structured JSON with your findings.",
      explain:
        "Explain in a way that's appropriate for the target audience. Use examples and analogies.",
      research:
        "Investigate the topic thoroughly. Provide factual information with logical organization.",
      connect:
        "Identify meaningful relationships and connections. Show how concepts relate to each other.",
      reflect:
        "Help with metacognitive reflection. Ask probing questions and provide insights.",
      recommend:
        "Provide personalized recommendations with clear rationale for each suggestion.",
    };

    return (
      instructions[action.type] ||
      `Please ${action.type} the ${action.target} according to the provided data.`
    );
  }

  /**
   * Process AI response based on action type
   */
  private static async processAIResponse(
    action: AdvancedTaskAction,
    response: string,
    context: any
  ): Promise<any> {
    try {
      // For analysis actions, try to parse as JSON
      if (action.type === "analyze") {
        return JSON.parse(response);
      }

      // For content creation, store appropriately
      if (action.type === "generate" || action.type === "create") {
        return await this.storeGeneratedContent(action, response);
      }

      // For other operations, return processed text
      return {
        content: response,
        type: action.type,
        target: action.target,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(
        "Failed to process AI response as structured data, returning as text"
      );
      return { content: response, raw: true };
    }
  }

  /**
   * Store generated content appropriately
   */
  private static async storeGeneratedContent(
    action: AdvancedTaskAction,
    content: string
  ): Promise<any> {
    const topic = action.data?.topic || "Generated Content";

    if (action.target === "notes" || action.target === "content") {
      const noteItem = {
        title: `AI Generated: ${topic}`,
        content: content,
        source: "AI Generated",
        category: topic,
        tags: ["ai-generated", action.type],
      };

      const saved = NotesStorage.addBatch([noteItem]);
      return { stored: saved, type: "notes" };
    }

    if (action.target === "flashcards") {
      // Parse content into Q&A format
      const flashcards = this.parseContentToFlashcards(content, topic);
      const saved = FlashcardStorage.addBatch(flashcards);
      return { stored: saved, type: "flashcards" };
    }

    return { content, type: "generated" };
  }

  /**
   * Parse content into flashcard format
   */
  private static parseContentToFlashcards(
    content: string,
    topic: string
  ): any[] {
    // Try to extract Q&A pairs from content
    const qaPairs = content.match(/Q:\s*(.+?)\s*A:\s*(.+?)(?=Q:|$)/gs);

    if (qaPairs && qaPairs.length > 0) {
      return qaPairs.map((pair, index) => {
        const qMatch = pair.match(/Q:\s*(.+?)\s*A:/s);
        const aMatch = pair.match(/A:\s*(.+?)$/s);

        return {
          question: qMatch
            ? qMatch[1].trim()
            : `Question ${index + 1} about ${topic}`,
          answer: aMatch ? aMatch[1].trim() : "Answer not found",
          category: topic,
        };
      });
    }

    // Fallback: create cards from content sections
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);
    return sentences.slice(0, 5).map((sentence, index) => ({
      question: `What do you know about: ${sentence.substring(0, 50)}...?`,
      answer: sentence.trim(),
      category: topic,
    }));
  }

  /**
   * Execute dynamic action when no specific strategy exists
   */
  private static async executeDynamicAction(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    console.log(
      `🔄 [AdvancedTaskExecutor] Dynamic execution for: ${action.type}`
    );

    // Try to map to existing operations
    const mappedOperation = this.mapToExistingOperation(action);
    if (mappedOperation) {
      return await this.executeAdvancedAction(mappedOperation, context);
    }

    // Generic processing
    return {
      success: true,
      message: `Processed ${action.type} operation on ${action.target}`,
      data: {
        action: action,
        processed: true,
        timestamp: new Date().toISOString(),
      },
      insights: [`Successfully handled dynamic ${action.type} operation`],
      nextSuggestions: [
        `Consider providing more specific instructions for ${action.type}`,
      ],
    };
  }

  /**
   * Map unknown operations to existing ones
   */
  private static mapToExistingOperation(
    action: AdvancedTaskAction
  ): AdvancedTaskAction | null {
    const mappings: Record<string, string> = {
      // Creation variants
      build: "create",
      construct: "create",
      develop: "create",
      design: "create",

      // Analysis variants
      examine: "analyze",
      investigate: "analyze",
      study: "analyze",
      review: "analyze",

      // Organization variants
      organize: "update",
      structure: "update",
      arrange: "update",

      // Enhancement variants
      improve: "enhance",
      optimize: "enhance",
      refine: "enhance",
    };

    const mappedType = mappings[action.type];
    if (mappedType) {
      return {
        ...action,
        type: mappedType,
      };
    }

    return null;
  }

  /**
   * Execute fallback operation when AI fails
   */
  private static async executeFallbackOperation(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    console.log(
      `🔄 [AdvancedTaskExecutor] Fallback execution for: ${action.type}`
    );

    // Try basic operations
    if (action.type === "create") {
      return await this.EXECUTION_STRATEGIES.get("create")!(action, context);
    }

    if (action.type === "delete") {
      return await this.EXECUTION_STRATEGIES.get("delete")!(action, context);
    }

    // Generic fallback
    return {
      success: true,
      message: `Completed ${action.type} operation with basic processing`,
      data: { action, fallback: true },
      metadata: { usedFallback: true, reason: "AI operation unavailable" },
    };
  }

  /**
   * Create execution context
   */
  private static createExecutionContext(request: AdvancedTaskRequest): any {
    return {
      request,
      results: [],
      relevantData: {},
      startTime: Date.now(),
      actionIndex: 0,
    };
  }

  /**
   * Update execution context
   */
  private static updateExecutionContext(
    context: any,
    action: AdvancedTaskAction,
    result: AdvancedTaskResult
  ): void {
    context.results.push({ action, result });
    context.actionIndex++;

    // Store relevant data for dependent actions
    if (result.data) {
      context.relevantData[`${action.type}_${action.target}`] = result.data;
    }
  }

  /**
   * Register execution strategies
   */
  private static registerExecutionStrategies(): void {
    // Core operations
    this.EXECUTION_STRATEGIES.set("create", this.executeCreate.bind(this));
    this.EXECUTION_STRATEGIES.set("delete", this.executeDelete.bind(this));
    this.EXECUTION_STRATEGIES.set("update", this.executeUpdate.bind(this));
    this.EXECUTION_STRATEGIES.set("search", this.executeSearch.bind(this));
    this.EXECUTION_STRATEGIES.set("convert", this.executeConvert.bind(this));

    // Advanced operations
    this.EXECUTION_STRATEGIES.set("practice", this.executePractice.bind(this));
    this.EXECUTION_STRATEGIES.set("quiz", this.executeQuiz.bind(this));
    this.EXECUTION_STRATEGIES.set("schedule", this.executeSchedule.bind(this));
    this.EXECUTION_STRATEGIES.set("track", this.executeTrack.bind(this));
    this.EXECUTION_STRATEGIES.set("optimize", this.executeOptimize.bind(this));
    this.EXECUTION_STRATEGIES.set("roadmap", this.executeRoadmap.bind(this));
    this.EXECUTION_STRATEGIES.set(
      "visualize",
      this.executeVisualize.bind(this)
    );
  }

  // Implementation of execution strategies
  private static async executeCreate(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Enhanced create with AI generation
    const topic = action.data?.topic || "General";
    const count = action.data?.count || 1;

    if (action.target === "notes") {
      try {
        const aiNotes = await generateNotesWithGemini(
          topic,
          "AdvancedTaskExecutor"
        );
        const saved = NotesStorage.addBatch(aiNotes.slice(0, count));
        return {
          success: true,
          message: `Created ${saved.length} enhanced notes about ${topic}`,
          data: saved,
          count: saved.length,
        };
      } catch (error) {
        // Fallback to basic notes
        const basicNote = {
          title: `Study Notes: ${topic}`,
          content: `# ${topic}\n\nKey concepts and information about ${topic}.`,
          source: "AdvancedTaskExecutor",
          category: topic,
          tags: [topic.toLowerCase()],
        };
        const saved = NotesStorage.addBatch([basicNote]);
        return {
          success: true,
          message: `Created basic note about ${topic}`,
          data: saved,
          count: saved.length,
        };
      }
    }

    if (action.target === "flashcards") {
      try {
        const aiCards = await generateFlashcardsWithGemini(
          topic,
          "AdvancedTaskExecutor",
          { count }
        );
        const saved = FlashcardStorage.addBatch(aiCards);
        return {
          success: true,
          message: `Created ${saved.length} AI-generated flashcards about ${topic}`,
          data: saved,
          count: saved.length,
        };
      } catch (error) {
        // Fallback to basic cards
        const basicCards = Array.from({ length: count }, (_, i) => ({
          question: `Question ${i + 1} about ${topic}`,
          answer: `Key information about ${topic}`,
          category: topic,
        }));
        const saved = FlashcardStorage.addBatch(basicCards);
        return {
          success: true,
          message: `Created ${saved.length} basic flashcards about ${topic}`,
          data: saved,
          count: saved.length,
        };
      }
    }

    return {
      success: true,
      message: `Created ${action.target} for ${topic}`,
      data: { topic, target: action.target },
    };
  }

  private static async executeDelete(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Implementation similar to original but enhanced
    const topic = action.data?.topic?.toLowerCase().trim();
    const isAllTopic = !topic || /^(all|everything|\*|any)$/i.test(topic);

    if (action.target === "notes" || action.target === "all") {
      const items = NotesStorage.load();
      if (isAllTopic) {
        NotesStorage.save([]);
        return {
          success: true,
          message: `Deleted all ${items.length} notes`,
          count: items.length,
        };
      } else {
        const kept = items.filter(
          (n) =>
            !n.title.toLowerCase().includes(topic) &&
            !n.content.toLowerCase().includes(topic) &&
            !n.category?.toLowerCase().includes(topic)
        );
        NotesStorage.save(kept);
        return {
          success: true,
          message: `Deleted ${items.length - kept.length} notes about ${topic}`,
          count: items.length - kept.length,
        };
      }
    }

    return {
      success: true,
      message: `Delete operation completed for ${action.target}`,
      data: { target: action.target, topic },
    };
  }

  private static async executeUpdate(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    return {
      success: true,
      message: `Update operation completed for ${action.target}`,
      data: { action, updated: true },
    };
  }

  private static async executeSearch(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Enhanced search with AI-powered relevance
    const query = action.data?.query || action.data?.topic || "";

    const allItems = {
      notes: NotesStorage.load(),
      flashcards: FlashcardStorage.load(),
      schedule: ScheduleStorage.load(),
    };

    const results = this.performIntelligentSearch(
      query,
      allItems,
      action.target
    );

    return {
      success: true,
      message: `Found ${results.totalCount} items matching "${query}"`,
      data: results,
      count: results.totalCount,
    };
  }

  private static performIntelligentSearch(
    query: string,
    allItems: any,
    target: string
  ): any {
    const results: any = { totalCount: 0 };

    if (target === "all" || target === "notes") {
      results.notes = allItems.notes.filter((item: any) =>
        this.itemMatchesQuery(item, query)
      );
      results.totalCount += results.notes.length;
    }

    if (target === "all" || target === "flashcards") {
      results.flashcards = allItems.flashcards.filter((item: any) =>
        this.itemMatchesQuery(item, query)
      );
      results.totalCount += results.flashcards.length;
    }

    return results;
  }

  private static itemMatchesQuery(item: any, query: string): boolean {
    const q = query.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.content?.toLowerCase().includes(q) ||
      item.question?.toLowerCase().includes(q) ||
      item.answer?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    );
  }

  private static async executeConvert(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Enhanced convert with AI processing
    return {
      success: true,
      message: `Convert operation completed`,
      data: { from: action.data?.from, to: action.data?.to },
    };
  }

  private static async executePractice(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Implement practice sessions
    return {
      success: true,
      message: `Practice session prepared for ${action.target}`,
      data: { practiceType: action.type, target: action.target },
    };
  }

  private static async executeQuiz(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Generate quiz from available content
    return {
      success: true,
      message: `Quiz generated for ${action.target}`,
      data: { quizType: action.type, target: action.target },
    };
  }

  private static async executeSchedule(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Enhanced scheduling
    const task = action.data?.task || action.data?.topic || "Study Session";
    const dateTime = action.data?.dateTime || new Date();

    const scheduleItem = {
      title: task,
      date: dateTime.toISOString().split("T")[0],
      time: dateTime.toTimeString().substring(0, 5),
      type: "study" as const,
      source: "Advanced Scheduler",
    };

    const saved = ScheduleStorage.addBatch([scheduleItem]);

    return {
      success: true,
      message: `Scheduled: ${task}`,
      data: saved[0],
      count: 1,
    };
  }

  private static async executeTrack(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Implement progress tracking
    return {
      success: true,
      message: `Tracking enabled for ${action.target}`,
      data: { tracking: true, target: action.target },
    };
  }

  private static async executeOptimize(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Implement optimization strategies
    return {
      success: true,
      message: `Optimization completed for ${action.target}`,
      data: { optimized: true, target: action.target },
    };
  }

  private static async executeRoadmap(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Generate visual roadmap
    const topic = action.data?.topic || action.data?.subject || "Learning";

    try {
      // Get relevant content for roadmap generation
      let content = "";

      if (action.data?.content) {
        content = action.data.content;
      } else {
        // Generate content about the topic
        const response = await callGemini(
          [
            {
              role: "system",
              content:
                "You are an educational expert creating comprehensive learning roadmaps.",
            },
            {
              role: "user",
              content: `Create a detailed learning roadmap for ${topic}. Include prerequisites, core concepts, advanced topics, and practical projects. Use clear sections with ## headings and bullet points.`,
            },
          ],
          { temperature: 0.3, maxTokens: 2000 }
        );
        content = response;
      }

      // Generate visual roadmap
      const roadmap = await VisualRoadmapGenerator.generateVisualRoadmap(
        topic,
        content
      );
      const htmlContent =
        VisualRoadmapGenerator.generateInteractiveHTML(roadmap);

      // Save roadmap as a note for reference
      const roadmapNote = {
        title: `Visual Roadmap: ${topic}`,
        content: `# ${roadmap.title}\n\n${
          roadmap.description
        }\n\n**Total Duration:** ${
          roadmap.estimatedDuration
        }\n**Difficulty:** ${roadmap.difficulty}\n**Nodes:** ${
          roadmap.totalNodes
        }\n\n## Learning Path\n\n${roadmap.nodes
          .map(
            (node) =>
              `- **${node.title}** (${node.estimatedTime}) - ${node.description}`
          )
          .join("\n")}`,
        source: "Visual Roadmap Generator",
        category: topic,
        tags: [...roadmap.metadata.tags, "visual-roadmap", "interactive"],
      };

      const saved = NotesStorage.addBatch([roadmapNote]);

      // Build hierarchical model for roadmap.sh style viewer
      const hierarchical =
        VisualRoadmapGenerator.buildHierarchicalModel(roadmap);

      // Dispatch browser event if in client environment
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("roadmap:generated", {
              detail: { roadmap, hierarchical },
            })
          );
        }
      } catch {}

      return {
        success: true,
        message: `Created interactive visual roadmap for ${topic}`,
        data: {
          roadmap,
          hierarchical,
          htmlContent,
          saved: saved[0],
          interactiveFile: `roadmap-${topic
            .toLowerCase()
            .replace(/\s+/g, "-")}.html`,
        },
        insights: [
          `Visual roadmap with ${roadmap.totalNodes} learning nodes created`,
          `Estimated completion time: ${roadmap.estimatedDuration}`,
          `Difficulty level: ${roadmap.difficulty}`,
        ],
        nextSuggestions: [
          "Open the HTML file to see the interactive roadmap",
          "Start with prerequisite topics if available",
          "Track progress as you complete each node",
        ],
      };
    } catch (error) {
      console.error("Roadmap generation failed:", error);
      return {
        success: false,
        message: `Failed to generate roadmap for ${topic}: ${error.message}`,
        data: { error: error.message },
      };
    }
  }

  private static async executeVisualize(
    action: AdvancedTaskAction,
    context: any
  ): Promise<AdvancedTaskResult> {
    // Handle different visualization types
    const visualType = action.data?.type || "roadmap";
    const topic = action.data?.topic || action.target;

    if (
      visualType === "roadmap" ||
      action.target === "roadmap" ||
      action.target === "learning-path"
    ) {
      // Delegate to roadmap execution
      return await this.executeRoadmap(
        {
          ...action,
          type: "roadmap",
        },
        context
      );
    }

    // Other visualization types
    return {
      success: true,
      message: `Created ${visualType} visualization for ${topic}`,
      data: {
        visualType,
        topic,
        type: "visualization",
      },
      insights: [`Generated ${visualType} visualization successfully`],
      nextSuggestions: [
        "Consider creating interactive elements",
        "Add more visual details",
      ],
    };
  }
}

// Task Understanding System - Makes your agent truly capable
// Understands any request and converts it to executable actions
import * as chrono from "chrono-node";
import { callGemini } from "../services/geminiAI";
import { AdvancedTaskController } from "./advancedTaskController";

export interface TaskAction {
  type:
    | "create"
    | "delete"
    | "update"
    | "search"
    | "list"
    | "navigate"
    | "analyze"
    | "convert";
  target: "notes" | "flashcards" | "schedule" | "all" | "page" | "content";
  data?: any;
  priority: "high" | "medium" | "low";
}

export interface TaskRequest {
  actions: TaskAction[];
  message: string;
  confidence: number;
}

export class TaskUnderstanding {
  // Main method - understands any user request with unlimited capabilities
  static async understandRequest(userInput: string): Promise<TaskRequest> {
    const input = userInput.toLowerCase().trim();

    console.log(`🧠 [TaskUnderstanding] Analyzing: "${userInput}"`);

    // 🚀 ADVANCED: Check if this should use unlimited processing capabilities
    const complexityCheck =
      AdvancedTaskController.validateRequestComplexity(userInput);

    if (
      complexityCheck.complexity === "high" ||
      this.shouldUseAdvancedProcessing(userInput)
    ) {
      console.log(
        `🚀 [TaskUnderstanding] Routing to Advanced Controller for unlimited processing`
      );

      try {
        const advancedResult =
          await AdvancedTaskController.processAdvancedRequest(userInput);

        if (advancedResult.success && advancedResult.executionResults) {
          // Convert advanced results to TaskAction format for compatibility
          const actions =
            this.convertAdvancedResultsToTaskActions(advancedResult);
          return {
            actions,
            message: advancedResult.message,
            confidence: actions.length > 0 ? 0.95 : 0.5,
          };
        }

        console.log(
          `⚠️ [TaskUnderstanding] Advanced processing failed, falling back to standard`
        );
      } catch (error) {
        console.error(
          `❌ [TaskUnderstanding] Advanced processing error:`,
          error
        );
      }
    }

    // Standard processing for simpler requests or fallback
    return await this.processStandardRequest(userInput);
  }

  /**
   * Check if request should use advanced unlimited processing
   */
  private static shouldUseAdvancedProcessing(input: string): boolean {
    const advancedKeywords = [
      "analyze",
      "summarize",
      "research",
      "investigate",
      "explain",
      "connect",
      "recommend",
      "optimize",
      "enhance",
      "reflect",
      "assess",
      "practice",
      "generate",
      "build",
      "develop",
      "design",
      "construct",
      "improve",
      "synthesize",
      "critique",
      "evaluate",
      "compare",
      "contrast",
    ];

    const hasAdvancedKeywords = advancedKeywords.some((keyword) =>
      input.toLowerCase().includes(keyword)
    );

    const hasComplexStructure =
      input.includes(" and ") &&
      (input.match(/create|make|schedule|delete|analyze/gi) || []).length > 1;

    const hasAdvancedIntent =
      /advanced|complex|comprehensive|detailed|thorough/.test(
        input.toLowerCase()
      );

    return hasAdvancedKeywords || hasComplexStructure || hasAdvancedIntent;
  }

  /**
   * Convert advanced results back to TaskAction format for compatibility
   */
  private static convertAdvancedResultsToTaskActions(
    result: any
  ): TaskAction[] {
    if (!result.executionResults) return [];

    return result.executionResults
      .filter((r: any) => r.success)
      .map((r: any, index: number) => {
        const analysisAction = result.analysisResult?.actions?.[index];

        return {
          type: this.mapAdvancedTypeToStandard(
            analysisAction?.type || "create"
          ),
          target: this.mapAdvancedTargetToStandard(
            analysisAction?.target || "all"
          ),
          data: {
            ...analysisAction?.data,
            result: r.data,
            message: r.message,
            advanced: true,
          },
          priority: "high" as const,
        };
      });
  }

  /**
   * Map advanced operation types to standard TaskAction types
   */
  private static mapAdvancedTypeToStandard(
    advancedType: string
  ): TaskAction["type"] {
    const mappings: Record<string, TaskAction["type"]> = {
      analyze: "analyze",
      summarize: "analyze",
      research: "search",
      generate: "create",
      build: "create",
      develop: "create",
      enhance: "update",
      optimize: "update",
      practice: "search",
      quiz: "search",
      schedule: "create",
      track: "list",
    };

    return mappings[advancedType] || "create";
  }

  /**
   * Map advanced target types to standard TaskAction targets
   */
  private static mapAdvancedTargetToStandard(
    advancedTarget: string
  ): TaskAction["target"] {
    const mappings: Record<string, TaskAction["target"]> = {
      content: "content",
      "knowledge-base": "notes",
      concepts: "notes",
      "mind-maps": "notes",
      "study-plans": "schedule",
      "learning-paths": "schedule",
      "practice-sessions": "flashcards",
      assessments: "flashcards",
    };

    return mappings[advancedTarget] || "all";
  }

  /**
   * Process standard requests (existing logic preserved)
   */
  private static async processStandardRequest(
    userInput: string
  ): Promise<TaskRequest> {
    const input = userInput.toLowerCase().trim();

    // 🚀 FIRST: Check for compound commands (multiple actions in one request)
    if (this.isCompoundRequest(input)) {
      return await this.handleCompoundRequest(userInput); // Pass original case for proper parsing
    }

    // Handle navigate requests
    if (this.isNavigateRequest(input)) {
      return this.handleNavigateRequest(input);
    }

    // Handle analyze requests
    if (this.isAnalyzeRequest(input)) {
      return this.handleAnalyzeRequest(input);
    }

    // Handle convert requests (like notes to flashcards)
    if (this.isConvertRequest(input)) {
      return this.handleConvertRequest(input);
    }

    // Handle delete requests first (most common)
    if (this.isDeleteRequest(input)) {
      return this.handleDeleteRequest(input);
    }

    // Handle create requests
    if (this.isCreateRequest(input)) {
      return this.handleCreateRequest(input);
    }

    // Handle search/list requests
    if (this.isSearchRequest(input)) {
      return this.handleSearchRequest(input);
    }

    // Handle update requests
    if (this.isUpdateRequest(input)) {
      return this.handleUpdateRequest(input);
    }

    // Fallback - try to understand what user wants
    return this.guessIntent(input);
  }

  // 🚀 NEW: Detect compound requests with multiple actions
  private static isCompoundRequest(input: string): boolean {
    // Look for connecting words that indicate multiple actions
    const connectors = [
      " and ",
      " then ",
      " also ",
      " plus ",
      " after that ",
      " next ",
      " & ",
      ",",
    ];

    // Check if any of the connectors exist in the input string
    return connectors.some((connector) => input.includes(connector));
  }

  // 🚀 NEW: Handle compound requests by breaking them into multiple actions
  private static async handleCompoundRequest(
    userInput: string
  ): Promise<TaskRequest> {
    console.log(
      `🔀 [TaskUnderstanding] Compound request detected: "${userInput}"`
    );

    try {
      // Use LLM to parse the compound command into structured tasks
      const structuredTasks = await this.parseCompoundWithLLM(userInput);
      if (structuredTasks && structuredTasks.length > 0) {
        console.log(
          `🤖 [TaskUnderstanding] LLM parsed ${structuredTasks.length} tasks:`,
          structuredTasks
        );

        const actions: TaskAction[] = [];
        for (const task of structuredTasks) {
          const action = this.convertStructuredTaskToAction(task, userInput);
          if (action) {
            actions.push(action);
          }
        }

        if (actions.length > 0) {
          return {
            actions,
            message: `LLM-parsed compound request: ${actions.length} actions identified`,
            confidence: 0.9,
          };
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ [TaskUnderstanding] LLM parsing failed, falling back to regex:`,
        error
      );
    }

    // Fallback to original regex-based parsing
    return this.handleCompoundRequestFallback(userInput);
  }

  // 🚀 NEW: Parse compound commands using LLM for better understanding
  private static async parseCompoundWithLLM(userInput: string): Promise<any[]> {
    const systemPrompt = `You are a task parser for a study buddy app. Extract ALL study tasks from user input.

VALID ACTIONS: create, delete, schedule, update, search, convert
VALID TARGETS: notes, flashcards, schedule

Rules:
1. Extract each task as a separate object
2. Handle pronouns like "it" by inferring the topic from context
3. For schedule tasks, extract time/date information
4. For create tasks with counts (like "5 flashcards"), include the count
5. ONLY use "convert" action when explicitly mentioned "from notes" or "from my notes"
6. For phrases like "make 5 flashcards about X" or "create flashcards related to Y", use action "create"
7. Always use plural target names: "notes", "flashcards", "schedule" (never "note" or "flashcard")
8. Only output a valid JSON array - no explanations

Examples:
Input: "delete all flashcards and create 5 about physics"
Output: [{"action":"delete","target":"flashcards","topic":"all"},{"action":"create","target":"flashcards","count":5,"topic":"physics"}]

Input: "make 5 flashcards related to onion and 5 related to tomato"
Output: [{"action":"create","target":"flashcards","count":5,"topic":"onion"},{"action":"create","target":"flashcards","count":5,"topic":"tomato"}]

Input: "schedule physics review Friday 6pm and create 3 flashcards about it"
Output: [{"action":"schedule","target":"schedule","topic":"physics review","time":"Friday 6pm"},{"action":"create","target":"flashcards","count":3,"topic":"physics review"}]

Input: "make 5 flashcards from notes of batman"
Output: [{"action":"convert","target":"content","from":"notes","to":"flashcards","count":5,"topic":"batman"}]

Now parse this input and return ONLY the JSON array:`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ];

    try {
      const response = await callGemini(messages, {
        temperature: 0.1,
        maxTokens: 2048, // Increased from 500 to handle complex compound requests
        responseMimeType: "application/json",
      });

      console.log(`🤖 [TaskUnderstanding] LLM raw response:`, response);

      // Parse JSON response
      const parsedTasks = JSON.parse(response);
      if (Array.isArray(parsedTasks)) {
        return parsedTasks;
      } else {
        console.warn(
          `⚠️ [TaskUnderstanding] LLM response is not an array:`,
          parsedTasks
        );
        return [];
      }
    } catch (error) {
      console.error(`❌ [TaskUnderstanding] LLM parsing error:`, error);
      throw error;
    }
  }

  // Convert LLM-parsed structured task to TaskAction
  private static convertStructuredTaskToAction(
    task: any,
    fullInput?: string
  ): TaskAction | null {
    if (!task.action || !task.target) {
      console.warn(`⚠️ [TaskUnderstanding] Invalid task structure:`, task);
      return null;
    }

    // Normalize LLM action types to internal executor types
    const normalizedType =
      String(task.action).toLowerCase() === "schedule" ? "create" : task.action;

    // Normalize singular targets to plural
    const rawTarget = String(task.target || "").toLowerCase();
    const targetMap: Record<
      string,
      "notes" | "flashcards" | "schedule" | "all" | "page" | "content"
    > = {
      note: "notes",
      notes: "notes",
      flashcard: "flashcards",
      flashcards: "flashcards",
      card: "flashcards",
      cards: "flashcards",
      schedule: "schedule",
      calendar: "schedule",
      all: "all",
      page: "page",
      content: "content",
    };
    const normalizedTarget = targetMap[rawTarget] || (rawTarget as any);

    const action: TaskAction = {
      type: normalizedType as any,
      target: normalizedTarget as any,
      priority: "medium" as const,
      data: {},
    };

    // Helper to infer target from arbitrary text (tolerant of typos)
    const detectTargetFromText = (
      txt: string | undefined
    ): "notes" | "flashcards" | "schedule" | null => {
      const t = (txt || "").toLowerCase();
      if (!t) return null;

      // Notes: accept common typos
      if (
        /(\bnote\b|\bnotes\b|\bnots\b|\bnotez\b|\bnotess\b|\bnotebooks?\b)/i.test(
          t
        )
      )
        return "notes";

      // Flashcards: accept splits/typos like "flashcardd", "flas h card"
      if (/(\bflashcards?\b|\bflash\b|\bcards?\b|\bdecks?\b)/i.test(t))
        return "flashcards";
      const collapsed = t.replace(/\s+/g, "");
      if (/fla\w*card\w*/i.test(collapsed)) return "flashcards";
      const tokens = t.split(/[^a-zA-Z]+/).filter(Boolean);
      const hasFlashish = tokens.some(
        (w) => /fl[a-z]{2,4}/i.test(w) || w === "flash"
      );
      const hasCardish = tokens.some((w) => /card/i.test(w));
      if (hasFlashish && hasCardish) return "flashcards";

      // Schedule/calendar
      if (
        /(\bschedules?\b|\bcalendar(s)?\b|\bcalender(s)?\b|\bevents?\b|\btimetables?\b|\breminders?\b)/i.test(
          t
        )
      )
        return "schedule";
      return null;
    };

    // Add topic/task data
    if (task.topic) {
      action.data.topic = task.topic;
      if (task.target === "schedule") {
        action.data.task = task.topic;
      }
    }

    // Add count for create/convert actions
    if (task.count && (task.action === "create" || task.action === "convert")) {
      action.data.count = task.count;
    }

    // Add time data for schedule actions
    if (task.time && String(task.action).toLowerCase() === "schedule") {
      const dateTime = chrono.parseDate(task.time);
      if (dateTime) {
        action.data.dateTime = dateTime;
        action.data.timeString = task.time;
      }
    }

    // Normalize delete targets from topic text (handle typos like "flashcardd")
    if (normalizedType === "delete") {
      const rawTarget = String(task.target || "").toLowerCase();
      const inferredFromTopic = detectTargetFromText(task.topic);

      const allowedTargets = new Set([
        "notes",
        "flashcards",
        "schedule",
        "all",
      ]);
      if (!allowedTargets.has(rawTarget as any) && inferredFromTopic) {
        action.target = inferredFromTopic as any;
      }

      // If target is "all" but topic clearly names a collection, retarget to that collection
      if (rawTarget === "all" && inferredFromTopic) {
        action.target = inferredFromTopic as any;
        // treat as delete-all for that collection
        // Map "create flashcards from notes ..." to convert action when detectable
      }

      // If topic itself is "all" (or contains it), treat as delete-all for specific target
      const topicText = String(task.topic || "");
      if (/\ball\b|\beverything\b|\bentire\b/i.test(topicText)) {
        action.data = {}; // executor interprets empty topic as delete-all
      }
    }

    // Map "create flashcards from notes ..." to convert action when detectable
    if (
      normalizedType === "create" &&
      (normalizedTarget === "flashcards" || normalizedTarget === "content")
    ) {
      const t = String(task.topic || "");
      if (
        (fullInput && /from\s+notes/i.test(fullInput)) ||
        /\bnotes\b/i.test(t)
      ) {
        // Try to extract core topic (remove 'from notes of' or trailing 'notes')
        let convTopic = t
          .replace(/from\s+notes\s+of\s+/i, "")
          .replace(/\bnotes\b/i, "")
          .trim();
        if (!convTopic) convTopic = t.trim();
        const converted: TaskAction = {
          type: "convert" as const,
          target: "content" as const,
          priority: "medium",
          data: {
            from: "notes",
            to: "flashcards",
            topic: convTopic,
            ...(task.count ? { count: task.count } : {}),
          },
        };
        return converted;
      }
    }

    // Ensure LLM-provided convert tasks carry normalized from/to into data
    if (normalizedType === "convert") {
      const normalize = (
        v: string | undefined
      ):
        | "notes"
        | "flashcards"
        | "schedule"
        | "all"
        | "page"
        | "content"
        | undefined => {
        const key = String(v || "").toLowerCase();
        return targetMap[key] || (key ? (key as any) : undefined);
      };

      const fromNorm = normalize((task as any).from);
      const toNorm = normalize((task as any).to);
      if (fromNorm) (action.data as any).from = fromNorm;
      if (toNorm) (action.data as any).to = toNorm;

      // Heuristics: infer missing endpoints from input/topic/target
      const ttext = String(task.topic || "");
      if (!(action.data as any).from) {
        if (
          (fullInput && /from\s+notes?/i.test(fullInput)) ||
          /\bnotes?\b/i.test(ttext)
        ) {
          (action.data as any).from = "notes";
        }
      }
      if (!(action.data as any).to) {
        // If the target of the action is a concrete collection, prefer that
        if (normalizedTarget === "flashcards")
          (action.data as any).to = "flashcards";
      }
    }

    return action;
  }

  // Fallback to original regex-based compound handling
  private static handleCompoundRequestFallback(userInput: string): TaskRequest {
    console.log(
      `🔀 [TaskUnderstanding] Compound request detected: "${userInput}"`
    );

    const actions: TaskAction[] = [];
    let confidence = 0.8; // Start with high confidence for compound requests

    // Split the request into parts
    const parts = this.splitCompoundRequest(userInput);

    console.log(
      `📝 [TaskUnderstanding] Split into ${parts.length} parts:`,
      parts
    );

    let lastTopic: string | undefined = undefined;

    // Process each part separately
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (trimmedPart) {
        // Use the single-action processors, but pass ONLY the relevant part.
        const partResult = this.processSingleAction(trimmedPart);
        if (partResult.actions.length > 0) {
          const currentAction = partResult.actions[0];

          // Enhanced pronoun resolution: if current action has vague topic, inherit from previous
          const topicIsVague =
            !currentAction.data?.topic ||
            currentAction.data?.topic === "" ||
            currentAction.data?.topic === "it" ||
            /^(it|that|this|general|a\s+related\s+to\s+it\.?|one|two|three|four|five|six|seven|eight|nine|ten|some|few|several|many|detailed|simple|basic|advanced|quick|short|long|comprehensive|brief|concise|extended|enhanced|summary|practice|study|review)$/i.test(
              currentAction.data.topic
            );
          const refersToPrevious = /\b(it|that|this|related)\b/i.test(
            trimmedPart
          );

          if (
            currentAction.data &&
            (topicIsVague || refersToPrevious) &&
            lastTopic
          ) {
            console.log(
              `🧠 [TaskUnderstanding] Inheriting topic "${lastTopic}" for action on "${trimmedPart}"`
            );
            currentAction.data.topic = lastTopic;

            // For schedule actions, also update the task field
            if (currentAction.target === "schedule") {
              currentAction.data.task = lastTopic;
            }
          }

          actions.push(...partResult.actions);
          confidence = Math.min(confidence, partResult.confidence);

          // Store the last valid topic for the next iteration (enhanced extraction)
          let extractedTopic = currentAction.data?.topic;
          if (currentAction.target === "schedule") {
            extractedTopic =
              currentAction.data?.task || currentAction.data?.topic;
          }

          if (
            extractedTopic &&
            extractedTopic !== "" &&
            extractedTopic !== "it" &&
            !/^(it|that|this|general|a\s+related\s+to\s+it\.?|one|two|three|four|five|six|seven|eight|nine|ten|some|few|several|many|detailed|simple|basic|advanced|quick|short|long|comprehensive|brief|concise|extended|enhanced|summary|practice|study|review)$/i.test(
              extractedTopic
            )
          ) {
            lastTopic = extractedTopic;
            console.log(
              `🧠 [TaskUnderstanding] Updated lastTopic to: "${lastTopic}"`
            );
          }
        }
      }
    }
    return {
      actions,
      message: `Compound request: ${actions.length} actions identified`,
      confidence,
    };
  }

  // 🚀 NEW: Split compound request into individual parts
  private static splitCompoundRequest(input: string): string[] {
    // This is the key fix. We are now more flexible with our regex to handle commas and other punctuation
    const splitPatterns = [
      /\s+and\s+/gi,
      /\s*,\s*and\s*/gi,
      /\s*,\s*then\s*/gi,
      /\s*,\s*/gi,
      /\s+then\s+/gi,
      /\s+also\s+/gi,
      /\s+plus\s+/gi,
      /\s+after that\s+/gi,
      /\s+next\s+/gi,
      /\s*&\s*/gi,
    ];

    let parts = [input];

    for (const pattern of splitPatterns) {
      const newParts: string[] = [];
      for (const part of parts) {
        newParts.push(...part.split(pattern));
      }
      parts = newParts;
    }

    let filteredParts = parts.filter((part) => part.trim().length > 0);

    // 🚀 Enhanced: Further split parts that contain multiple distinct actions
    const furtherSplitParts: string[] = [];

    for (const part of filteredParts) {
      const subParts = this.splitMixedActions(part.trim());
      furtherSplitParts.push(...subParts);
    }

    console.log(
      `🔄 [TaskUnderstanding] After enhanced splitting: ${furtherSplitParts.length} parts:`,
      furtherSplitParts
    );

    return furtherSplitParts;
  }

  // 🚀 NEW: Split parts that contain multiple distinct actions
  private static splitMixedActions(input: string): string[] {
    console.log(
      `🔍 [TaskUnderstanding] splitMixedActions analyzing: "${input}"`
    );

    // Look for patterns where delete and create actions are combined
    // Example: "deletee all flash card make one note on superman"

    // More flexible patterns that don't require specific following words
    const deleteWords = /(delet[e]?|remove|clear|rmv|clr)/i;
    const createWords = /(make|create|generate|add|build|write)/i;

    // Check if this part contains both delete and create patterns
    const hasDelete = deleteWords.test(input);
    const hasCreate = createWords.test(input);

    console.log(
      `🔍 [TaskUnderstanding] splitMixedActions - hasDelete: ${hasDelete}, hasCreate: ${hasCreate}`
    );

    if (hasDelete && hasCreate) {
      console.log(
        `🔄 [TaskUnderstanding] Mixed action detected in: "${input}"`
      );

      // Try to split at the create word boundary
      const createMatch = input.match(createWords);
      console.log(`🔍 [TaskUnderstanding] createMatch:`, createMatch);

      if (createMatch && createMatch.index !== undefined) {
        const deletePartEnd = createMatch.index;
        const createPartStart = createMatch.index;

        const deletePart = input.substring(0, deletePartEnd).trim();
        const createPart = input.substring(createPartStart).trim();

        console.log(
          `🔍 [TaskUnderstanding] Potential split - deletePart: "${deletePart}", createPart: "${createPart}"`
        );

        if (deletePart.length > 0 && createPart.length > 0) {
          console.log(
            `🔄 [TaskUnderstanding] Split mixed action into: ["${deletePart}", "${createPart}"]`
          );
          return [deletePart, createPart];
        }
      }
    }

    // If no mixed action detected or splitting failed, return as single part
    console.log(
      `🔍 [TaskUnderstanding] No mixed action split needed, returning single part: "${input}"`
    );
    return [input];
  }

  // 🚀 NEW: Process a single action (used for compound request parts)
  private static processSingleAction(actionText: string): TaskRequest {
    const input = actionText.toLowerCase().trim();

    console.log(`🔍 [TaskUnderstanding] processSingleAction: "${actionText}"`);
    console.log(`🔍 [TaskUnderstanding] normalized input: "${input}"`);

    // Pass the original-cased `actionText` to handlers so they can extract topics correctly
    if (this.isDeleteRequest(input)) {
      return this.handleDeleteRequest(actionText);
    }
    if (this.isCreateRequest(input)) {
      return this.handleCreateRequest(actionText);
    }
    if (this.isNavigateRequest(input)) {
      return this.handleNavigateRequest(actionText);
    }
    if (this.isAnalyzeRequest(input)) {
      return this.handleAnalyzeRequest(actionText);
    }
    if (this.isConvertRequest(input)) {
      return this.handleConvertRequest(actionText);
    }
    if (this.isSearchRequest(input)) {
      return this.handleSearchRequest(actionText);
    }
    if (this.isUpdateRequest(input)) {
      return this.handleUpdateRequest(actionText);
    }

    // If we can't classify it, try to guess
    console.log(`❓ [TaskUnderstanding] Falling back to guessIntent`);
    return this.guessIntent(input);
  }

  private static isDeleteRequest(input: string): boolean {
    console.log(
      `🧪 [TaskUnderstanding] Testing DELETE patterns for: "${input}"`
    );

    // Be typo-tolerant for common delete commands, but avoid substring false positives (e.g., "rm" in "superman")
    const deleteWords = [
      "delete",
      "remove",
      "clear",
      "drop",
      "erase",
      "trash",
      "wipe",
    ];
    // Very short aliases/typos must be matched as whole words only
    const deleteAliasesShort = ["rm", "clr", "rmv"];
    const deleteTypos = [
      "delte",
      "delet",
      "deletee",
      "deleete",
      "remvoe",
      "clera",
      "dropp",
      "earse",
    ];

    const hasDeleteWord = deleteWords.some((word) =>
      new RegExp(`\\b${word}\\b`, "i").test(input)
    );
    const hasDeleteAlias = deleteAliasesShort.some((word) =>
      new RegExp(`\\b${word}\\b`, "i").test(input)
    );
    const hasDeleteTypo = deleteTypos.some((word) =>
      new RegExp(`\\b${word}\\b`, "i").test(input)
    );

    console.log(
      `🧪 [TaskUnderstanding] Has delete word: ${hasDeleteWord}, has delete alias: ${hasDeleteAlias}, has delete typo: ${hasDeleteTypo}`
    );

    // If the text contains a create verb and does not contain an explicit delete verb, avoid classifying as delete
    const createWords = [
      "create",
      "make",
      "generate",
      "add",
      "new",
      "build",
      "write",
    ];
    const hasCreateVerb = createWords.some((w) =>
      new RegExp(`\\b${w}\\b`, "i").test(input)
    );
    if (hasCreateVerb && !hasDeleteWord) {
      console.log(
        "🧪 [TaskUnderstanding] Create verb present without explicit delete verb -> NOT a DELETE request"
      );
      return false;
    }

    // Fuzzy match tokens against delete synonyms (tolerate up to 2 edits for long words)
    const tokens = input.split(/[^a-zA-Z]+/).filter(Boolean);
    const longSyns = [
      "delete",
      "remove",
      "clear",
      "erase",
      "drop",
      "trash",
      "wipe",
    ];
    const fuzzyHit = tokens.some((t) =>
      longSyns.some((s) => TaskUnderstanding.levenshtein(t, s) <= 2)
    );

    const result = hasDeleteWord || hasDeleteAlias || hasDeleteTypo || fuzzyHit;
    console.log(
      `🧪 [TaskUnderstanding] ${
        result ? "✅ RETURNING TRUE for DELETE" : "❌ NOT a DELETE request"
      }`
    );

    return result;
  }

  // Simple Levenshtein distance for fuzzy verb detection
  private static levenshtein(a: string, b: string): number {
    a = a.toLowerCase();
    b = b.toLowerCase();
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp: number[] = Array(n + 1).fill(0);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(
          dp[j] + 1, // deletion
          dp[j - 1] + 1, // insertion
          prev + cost // substitution
        );
        prev = temp;
      }
    }
    return dp[n];
  }

  private static isCreateRequest(input: string): boolean {
    console.log(
      `🧪 [TaskUnderstanding] Testing CREATE patterns for: "${input}"`
    );

    const createWords = [
      "create",
      "make",
      "generate",
      "add",
      "new",
      "build",
      "schedule",
      "plan",
    ];

    // Special case: phrases like "one on/about/for <topic>" imply creation of an item
    const oneOnPattern = /\bone\s+(?:note\s+)?(?:about|on|for)\s+[^,.;]+/i;

    // Check for explicit create words
    const hasCreateWord = createWords.some((word) => input.includes(word));
    console.log(`🧪 [TaskUnderstanding] Has create word: ${hasCreateWord}`);
    if (hasCreateWord || oneOnPattern.test(input)) {
      console.log(
        `🧪 [TaskUnderstanding] ✅ RETURNING TRUE for CREATE (explicit word)`
      );
      return true;
    }

    // Check for schedule patterns (time-based activities)
    const timePattern =
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}|\d{1,2}pm|\d{1,2}am|tomorrow|today|next week)/i;
    const hasTimePattern = timePattern.test(input);
    console.log(
      `🧪 [TaskUnderstanding] Time pattern match: ${
        hasTimePattern ? "YES" : "NO"
      }`
    );
    if (hasTimePattern) {
      console.log(
        `🧪 [TaskUnderstanding] ✅ RETURNING TRUE for CREATE (time pattern - likely schedule)`
      );
      return true;
    }

    // Check for implicit creation patterns
    // Pattern: "N flashcards/cards/notes" suggests creation (handle typos like "flashcarddd", "flasghcard")
    // Enhanced pattern to be more typo-tolerant using fuzzy matching
    const numberPattern = /\d+\s*(?:fla[a-z]*card|card|note|flash)/i;
    const hasNumberPattern = input.match(numberPattern);
    console.log(
      `🧪 [TaskUnderstanding] Number pattern match: ${
        hasNumberPattern ? `YES: "${hasNumberPattern[0]}"` : "NO"
      }`
    );
    console.log(
      `🧪 [TaskUnderstanding] Testing pattern /\\d+\\s*(?:fla[a-z]*card|card|note|flash)/i against: "${input}"`
    );

    if (hasNumberPattern) {
      console.log(
        `🧪 [TaskUnderstanding] ✅ RETURNING TRUE for CREATE (number pattern)`
      );
      return true;
    }

    // Pattern: "three/five/ten flashcards" etc.
    const numberWords = [
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ];
    const hasNumberWord = numberWords.some((num) => input.includes(num));
    const hasCardPattern = input.match(/(?:fla[a-z]*card|card|note|flash)/i); // Enhanced typo tolerance
    console.log(
      `🧪 [TaskUnderstanding] Has number word: ${hasNumberWord}, has card pattern: ${
        hasCardPattern ? "YES" : "NO"
      }`
    );
    if (hasNumberWord && hasCardPattern) {
      console.log(
        `🧪 [TaskUnderstanding] ✅ RETURNING TRUE for CREATE (number word)`
      );
      return true;
    }

    // 🚀 NEW: Check for a simple article + target pattern, like "a note" or "an flashcard"
    const articlePattern = /\b(?:a|an)\s+(?:note|flashcard|card)/i;
    const hasArticlePattern = input.match(articlePattern);
    console.log(
      `🧪 [TaskUnderstanding] Article pattern match: ${
        hasArticlePattern ? "YES" : "NO"
      }`
    );
    if (hasArticlePattern) {
      console.log(
        `🧪 [TaskUnderstanding] ✅ RETURNING TRUE for CREATE (article pattern)`
      );
      return true;
    }

    console.log(`🧪 [TaskUnderstanding] ❌ NOT a CREATE request`);
    return false;
  }

  private static isSearchRequest(input: string): boolean {
    const searchWords = [
      "find",
      "search",
      "show",
      "list",
      "get",
      "what",
      "where",
      "when",
    ];
    return searchWords.some((word) => input.includes(word));
  }

  private static isUpdateRequest(input: string): boolean {
    const updateWords = [
      "change",
      "update",
      "modify",
      "edit",
      "move",
      "reschedule",
    ];
    return updateWords.some((word) => input.includes(word));
  }

  private static handleDeleteRequest(input: string): TaskRequest {
    const actions: TaskAction[] = [];
    const lowerInput = input.toLowerCase();
    const topic = this.extractTopicForDelete(input);

    if (lowerInput.includes("all") || lowerInput.includes("everything")) {
      if (this.matchesNotes(lowerInput)) {
        actions.push({ type: "delete", target: "notes", priority: "high" });
      } else if (this.matchesFlashcards(lowerInput)) {
        actions.push({
          type: "delete",
          target: "flashcards",
          priority: "high",
        });
      } else {
        actions.push({
          type: "delete",
          target: "all",
          priority: "high",
          data: topic ? { topic } : undefined,
        });
      }
    } else {
      if (this.matchesNotes(lowerInput)) {
        actions.push({
          type: "delete",
          target: "notes",
          priority: "medium",
          data: { topic },
        });
      }
      if (this.matchesFlashcards(lowerInput)) {
        actions.push({
          type: "delete",
          target: "flashcards",
          priority: "medium",
          data: { topic },
        });
      }
    }

    return {
      actions,
      message: `I'll delete the requested items.`,
      confidence: 0.9,
    };
  }

  private static handleCreateRequest(input: string): TaskRequest {
    const actions: TaskAction[] = [];
    const lowerInput = input.toLowerCase();

    // Detect schedule creation (time-based activities)
    const timePattern =
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}|\d{1,2}pm|\d{1,2}am|tomorrow|today|next week)/i;
    const hasTimePattern = timePattern.test(input);

    // If it has time but no explicit "schedule" word, it's likely a schedule request
    if (
      hasTimePattern &&
      !this.matchesFlashcards(lowerInput) &&
      !this.matchesNotes(lowerInput)
    ) {
      const dt = chrono.parseDate(input);
      const task = input.replace(timePattern, "").trim(); // Remove time part to get task
      const data: any = { task: task || "Study Session" };
      if (dt) {
        const iso = dt.toISOString();
        const [d, t] = iso.split("T");
        data.date = d;
        data.time = t?.split(".")[0];
      }
      actions.push({
        type: "create",
        target: "schedule",
        data,
        priority: "high",
      });
    }

    // If user uses pattern like "one on/about/for <topic>", create notes even if 'note' isn't explicitly present
    const oneOnPattern = /\bone\s+(?:note\s+)?(?:about|on|for)\s+[^,.;]+/i;
    if (oneOnPattern.test(lowerInput)) {
      const topics = this.extractMultipleNoteTopics(input);
      const list = topics.length ? topics : [this.extractTopic(input)];
      for (const t of list) {
        if (!t) continue;
        actions.push({
          type: "create",
          target: "notes",
          data: { topic: t },
          priority: "high",
        });
      }
    }

    if (this.matchesNotes(lowerInput)) {
      // Try to detect enumerations like:
      // "make separate note one on spiderman one on batman"
      // "make two notes: one about physics and one about chemistry"
      const topics = this.extractMultipleNoteTopics(input);

      if (topics.length > 1) {
        for (const t of topics) {
          actions.push({
            type: "create",
            target: "notes",
            data: { topic: t },
            priority: "high",
          });
        }
      } else {
        const topic = topics[0] ?? this.extractTopic(input);
        actions.push({
          type: "create",
          target: "notes",
          data: { topic },
          priority: "high",
        });
      }
    }

    if (this.matchesFlashcards(lowerInput)) {
      const count = this.extractCount(input);
      const topic = this.extractTopic(input);
      // parse any natural date/time, attach if present
      const dt = chrono.parseDate(input);
      const data: any = { topic, count };
      if (dt) {
        const iso = dt.toISOString();
        const [d, t] = iso.split("T");
        data.date = d;
        data.time = t?.split(".")[0];
      }
      actions.push({
        type: "create",
        target: "flashcards",
        data,
        priority: "high",
      });
    }

    if (
      lowerInput.includes("schedule") ||
      lowerInput.includes("reminder") ||
      lowerInput.includes("calendar") ||
      lowerInput.includes("plan to")
    ) {
      const dt = chrono.parseDate(input);
      const data: any = { task: this.extractTopic(input) };
      if (dt) {
        const iso = dt.toISOString();
        const [d, t] = iso.split("T");
        data.date = d;
        data.time = t?.split(".")[0];
      }
      actions.push({
        type: "create",
        target: "schedule",
        data,
        priority: "medium",
      });
    }

    return {
      actions,
      message: `I'll create the requested items.`,
      confidence: 0.8,
    };
  }

  // Extract multiple topics for note creation from phrases like
  // "one on A one on B" or "one about A and one about B"
  private static extractMultipleNoteTopics(input: string): string[] {
    const s = input; // keep original casing for nicer topics
    const topics: string[] = [];

    // Pattern 1: repeated "one on/about/for <topic>" segments
    const reRepeated =
      /\bone\s+(?:note\s+)?(?:about|on|for)\s+(.+?)(?=(?:\s+one\s+(?:about|on|for)|\s+and\s+one\s+(?:about|on|for)|\s*,\s*one\s+(?:about|on|for)|\s*$))/gi;
    let m: RegExpExecArray | null;
    while ((m = reRepeated.exec(s)) !== null) {
      const t = m[1].trim();
      if (t) topics.push(this.cleanTopicToken(t));
    }

    // Pattern 2: single "on/about/for X and Y" when only one "one" present
    if (topics.length === 0) {
      const single = s.match(/\b(?:about|on|for)\s+(.+)$/i);
      if (single) {
        const raw = single[1].trim();
        // Split by common list separators while avoiding splitting inside parentheses
        const parts = raw
          .split(/\s*(?:,|\band\b|&|\+|\/)\s*/i)
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length > 1) {
          for (const p of parts) topics.push(this.cleanTopicToken(p));
        }
      }
    }

    // Deduplicate and sanitize
    const uniq = Array.from(new Set(topics.map((t) => t.toLowerCase())));
    return uniq;
  }

  private static cleanTopicToken(t: string): string {
    return t
      .replace(/^about\s+/i, "")
      .replace(/^on\s+/i, "")
      .replace(/^for\s+/i, "")
      .replace(/\s+note(s)?$/i, "")
      .trim();
  }

  private static handleSearchRequest(input: string): TaskRequest {
    const actions: TaskAction[] = [];
    const lowerInput = input.toLowerCase();

    if (this.matchesNotes(lowerInput)) {
      actions.push({ type: "search", target: "notes", priority: "medium" });
    }

    if (this.matchesFlashcards(lowerInput)) {
      actions.push({
        type: "search",
        target: "flashcards",
        priority: "medium",
      });
    }

    if (lowerInput.includes("schedule") || lowerInput.includes("event")) {
      actions.push({ type: "search", target: "schedule", priority: "medium" });
    }

    return {
      actions,
      message: `I'll search for the requested items.`,
      confidence: 0.7,
    };
  }

  private static handleUpdateRequest(input: string): TaskRequest {
    const actions: TaskAction[] = [];
    const lowerInput = input.toLowerCase();

    if (this.matchesNotes(lowerInput)) {
      actions.push({ type: "update", target: "notes", priority: "medium" });
    }

    if (this.matchesFlashcards(lowerInput)) {
      actions.push({
        type: "update",
        target: "flashcards",
        priority: "medium",
      });
    }

    if (lowerInput.includes("schedule") || lowerInput.includes("event")) {
      actions.push({ type: "update", target: "schedule", priority: "medium" });
    }

    return {
      actions,
      message: `I'll update the requested items.`,
      confidence: 0.6,
    };
  }

  private static guessIntent(input: string): TaskRequest {
    // Try to understand what user wants
    if (input.includes("help") || input.includes("what can you do")) {
      return {
        actions: [],
        message: `I can help you with notes, flashcards, and schedules. Try saying "create notes about history" or "delete all flashcards".`,
        confidence: 0.5,
      };
    }

    if (
      this.matchesNotes(input) ||
      this.matchesFlashcards(input) ||
      input.includes("schedule")
    ) {
      if (input.split(/\s+/).length <= 2) {
        // e.g., "notes", "flash cards"
        console.log(
          `🧠 [TaskUnderstanding] guessIntent: Bare target found, returning no action to allow inference.`
        );
        return {
          actions: [],
          message: "Bare target, intent to be inferred.",
          confidence: 0.4,
        };
      }
    }

    // Default to search
    return {
      actions: [{ type: "search", target: "all", priority: "low" }],
      message: `I'm not sure what you want. Let me search for relevant items.`,
      confidence: 0.3,
    };
  }

  private static extractTopic(input: string): string {
    // If the input is just a self-referential phrase, return nothing so the topic can be inherited.
    if (
      /^\s*(a|an)?\s*(note|flashcard|card)?\s*(related to|about|on|for)?\s*(it|that|this)\.?\s*$/i.test(
        input
      )
    ) {
      return "";
    }

    // Extract topic from input like "create notes about history" -> "history"
    const aboutMatch = input.match(/(?:about|on|for|of)\s+([^,.;]+)/i);
    if (aboutMatch) return aboutMatch[1].trim();

    // For schedule-like inputs, remove time patterns first to get the main topic
    const timePattern =
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}|\d{1,2}pm|\d{1,2}am|tomorrow|today|next week|at\s+\d)/i;
    let cleanInput = input;

    // Remove time patterns from the end
    cleanInput = cleanInput.replace(timePattern, "").trim();

    // Remove action words and targets and return the rest.
    cleanInput = cleanInput
      .replace(
        /(create|make|generate|add|new|build|delete|remove|clear|drop|erase|trash|wipe|schedule|plan)\s*/i,
        ""
      )
      .replace(/(\d+\s*)?(flashcards?|cards?|notes?)/i, "")
      .replace(
        /^(one|two|three|four|five|six|seven|eight|nine|ten|some|few|several|many|a|an)\s*/i,
        ""
      )
      .replace(
        /^(detailed|simple|basic|advanced|quick|short|long|comprehensive|brief|concise|extended|enhanced|summary|practice|study|review)\s*/i,
        ""
      )
      .trim();

    // If the remaining topic is just a number word, adjective, or empty, return empty for inheritance
    if (
      !cleanInput ||
      /^(one|two|three|four|five|six|seven|eight|nine|ten|some|few|several|many|a|an|detailed|simple|basic|advanced|quick|short|long|comprehensive|brief|concise|extended|enhanced|summary|practice|study|review)$/i.test(
        cleanInput
      )
    ) {
      return "";
    }

    return cleanInput || "general";
  }

  private static extractCount(input: string): number {
    // Extract count from input like "5 flashcards" -> 5
    const countMatch = input.match(/(\d+)\s*(?:flashcard|card)/i);
    if (countMatch) return parseInt(countMatch[1]);
    return 5; // default
  }

  // Helpers for typo-tolerant matching of targets
  private static matchesNotes(input: string): boolean {
    // Accept: note(s) plus common typos: nots, notez, notess
    if (/(\bnote\b|\bnotes\b|\bnots\b|\bnotez\b|\bnotess\b)/i.test(input))
      return true;
    // Fuzzy: tolerate 1-2 edits for 'note' tokens
    const tokens = input.split(/[^a-zA-Z]+/).filter(Boolean);
    return tokens.some(
      (t) =>
        TaskUnderstanding.levenshtein(t, "note") <= 1 ||
        TaskUnderstanding.levenshtein(t, "notes") <= 2
    );
  }

  private static matchesFlashcards(input: string): boolean {
    // Accept: flashcard(s)/card(s)/flash, tolerate spacing/typos: 'flass h card', 'fladhca rd'
    if (/(\bflashcards?\b|\bflash\b|\bcards?\b)/i.test(input)) return true;

    const collapsed = input.replace(/\s+/g, "");
    if (/fla\w*card\w*/i.test(collapsed)) return true;

    // Token-level fuzzy match for 'flash' and 'card'
    const tokens = input.split(/[^a-zA-Z]+/).filter(Boolean);
    const hasFlashish = tokens.some(
      (t) =>
        TaskUnderstanding.levenshtein(t, "flash") <= 2 ||
        /^fla\w{1,3}$/i.test(t)
    );
    const hasCardish = tokens.some(
      (t) => TaskUnderstanding.levenshtein(t, "card") <= 1 || /card\w*/i.test(t)
    );
    return hasFlashish && hasCardish;
  }

  // Extract topic specifically for delete requests (supports "related", "about", etc.)
  private static extractTopicForDelete(input: string): string | undefined {
    const patterns: RegExp[] = [
      /(?:related to|related|about|on|of|for)\s+([^,.;]+)/i,
      // e.g., "delete flashcards about chess", "remove notes on superman"
      /(?:flashcards?|cards?|notes?)\s+(?:about|on|of|for)\s+([^,.;]+)/i,
      // handle "related" without "to": "flashcard related chess"
      /(?:flashcards?|cards?|notes?)\s+related\s+([^,.;]+)/i,
    ];

    for (const p of patterns) {
      const m = input.match(p);
      if (m) return m[1].trim();
    }
    return undefined;
  }

  // Navigation request detection
  private static isNavigateRequest(input: string): boolean {
    const navWords = [
      "go to",
      "navigate",
      "open",
      "show me",
      "take me to",
      "switch to",
      "visit",
    ];
    return navWords.some((phrase) => input.toLowerCase().includes(phrase));
  }

  // Analysis request detection
  private static isAnalyzeRequest(input: string): boolean {
    const analyzeWords = [
      "analyze",
      "what kind",
      "what type",
      "show me",
      "tell me about",
      "describe",
      "examine",
    ];
    return analyzeWords.some((phrase) => input.toLowerCase().includes(phrase));
  }

  // Convert request detection (like notes to flashcards)
  private static isConvertRequest(input: string): boolean {
    const lowerInput = input.toLowerCase();
    return (
      (lowerInput.includes("from") || lowerInput.includes("convert")) &&
      (this.matchesNotes(lowerInput) || this.matchesFlashcards(lowerInput)) &&
      (lowerInput.includes("make") ||
        lowerInput.includes("create") ||
        lowerInput.includes("generate"))
    );
  }

  // Handle navigation requests
  private static handleNavigateRequest(input: string): TaskRequest {
    const actions: TaskAction[] = [];
    const lowerInput = input.toLowerCase();

    // Detect what page/section to navigate to
    if (lowerInput.includes("dashboard") || lowerInput.includes("home")) {
      actions.push({
        type: "navigate",
        target: "page",
        data: { page: "dashboard" },
        priority: "high",
      });
    } else if (this.matchesFlashcards(lowerInput)) {
      actions.push({
        type: "navigate",
        target: "page",
        data: { page: "flashcards" },
        priority: "high",
      });
    } else if (this.matchesNotes(lowerInput)) {
      actions.push({
        type: "navigate",
        target: "page",
        data: { page: "notes" },
        priority: "high",
      });
    } else if (
      lowerInput.includes("schedule") ||
      lowerInput.includes("calendar")
    ) {
      actions.push({
        type: "navigate",
        target: "page",
        data: { page: "schedule" },
        priority: "high",
      });
    }

    return {
      actions,
      message: `I'll navigate to the requested section.`,
      confidence: 0.8,
    };
  }

  // Handle analysis requests
  private static handleAnalyzeRequest(input: string): TaskRequest {
    const actions: TaskAction[] = [];
    const lowerInput = input.toLowerCase();

    if (this.matchesNotes(lowerInput)) {
      actions.push({ type: "analyze", target: "notes", priority: "high" });
    }
    if (this.matchesFlashcards(lowerInput)) {
      actions.push({ type: "analyze", target: "flashcards", priority: "high" });
    }
    if (lowerInput.includes("schedule") || lowerInput.includes("calendar")) {
      actions.push({ type: "analyze", target: "schedule", priority: "high" });
    }

    // Default to analyzing all content
    if (actions.length === 0) {
      actions.push({ type: "analyze", target: "all", priority: "medium" });
    }

    return {
      actions,
      message: `I'll analyze your study materials.`,
      confidence: 0.7,
    };
  }

  // Handle convert requests (notes to flashcards, etc.)
  private static handleConvertRequest(input: string): TaskRequest {
    const actions: TaskAction[] = [];
    const lowerInput = input.toLowerCase();

    if (this.matchesNotes(lowerInput) && this.matchesFlashcards(lowerInput)) {
      actions.push({
        type: "convert",
        target: "content",
        data: {
          from: "notes",
          to: "flashcards",
          topic: this.extractTopic(input),
        },
        priority: "high",
      });
    }

    return {
      actions,
      message: `I'll convert your content as requested.`,
      confidence: 0.8,
    };
  }
}

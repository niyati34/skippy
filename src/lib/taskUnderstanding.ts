// Task Understanding System - Makes your agent truly capable
// Understands any request and converts it to executable actions

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
  // Main method - understands any user request
  static understandRequest(userInput: string): TaskRequest {
    const input = userInput.toLowerCase().trim();

    console.log(`🧠 [TaskUnderstanding] Analyzing: "${userInput}"`);

    // 🚀 FIRST: Check for compound commands (multiple actions in one request)
    if (this.isCompoundRequest(input)) {
      return this.handleCompoundRequest(userInput); // Pass original case for proper parsing
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

    return connectors.some((connector) => input.includes(connector));
  }

  // 🚀 NEW: Handle compound requests by breaking them into multiple actions
  private static handleCompoundRequest(userInput: string): TaskRequest {
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

    // Determine global intent (delete vs create) to guide bare-target parts
    const globalDeleteIntent = this.isDeleteRequest(userInput.toLowerCase());
    let lastCreateTarget: TaskAction["target"] | undefined = undefined;

    // Process each part separately
    for (const part of parts) {
      const trimmed = part.trim();
      const partResult = this.processSingleAction(trimmed);
      if (partResult.actions.length > 0) {
        actions.push(...partResult.actions);
        confidence = Math.min(confidence, partResult.confidence);
        // Track last explicit create target to infer for following segments
        const lastCreate = [...partResult.actions]
          .reverse()
          .find((a) => a.type === "create");
        if (lastCreate) {
          lastCreateTarget = lastCreate.target;
        }
      } else if (globalDeleteIntent) {
        // If no explicit action but overall it's a delete compound, infer deletes for bare targets
        const lower = trimmed.toLowerCase();
        const inferred: TaskAction[] = [];
        if (this.matchesNotes(lower)) {
          inferred.push({ type: "delete", target: "notes", priority: "high" });
        }
        if (this.matchesFlashcards(lower)) {
          inferred.push({
            type: "delete",
            target: "flashcards",
            priority: "high",
          });
        }
        if (inferred.length) {
          console.log(
            `🧠 [TaskUnderstanding] Inferring DELETE for bare target in compound: "${trimmed}"`,
            inferred
          );
          actions.push(...inferred);
        }
      } else if (
        lastCreateTarget &&
        this.looksLikeCreateContinuation(trimmed)
      ) {
        // Infer CREATE action continuing previous target (e.g., "10 related chocolate")
        const topic = this.extractTopicFromSegment(trimmed);
        const count = this.extractCountFromSegment(trimmed);
        const inferred: TaskAction = {
          type: "create",
          target: lastCreateTarget,
          data:
            lastCreateTarget === "flashcards" ? { topic, count } : { topic },
          priority: "high",
        };
        console.log(
          `🧠 [TaskUnderstanding] Inferring CREATE continuation for: "${trimmed}" ->`,
          inferred
        );
        actions.push(inferred);
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
    // Split on various connectors, preserving the original text
    const splitPatterns = [
      / and /gi,
      / then /gi,
      / also /gi,
      / plus /gi,
      / after that /gi,
      / next /gi,
      / & /gi,
      /,/g,
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

    // Test ALL patterns first for debugging
    const deleteResult = this.isDeleteRequest(input);
    const createResult = this.isCreateRequest(input);
    console.log(
      `🧪 [TaskUnderstanding] Classification test results: delete=${deleteResult}, create=${createResult}`
    );

    // Tie-breaker: if both delete and create match, prefer what the phrase starts with
    if (deleteResult && createResult) {
      const startsWithCreate = /^(make|create|generate|add|write|new)\b/i.test(
        input
      );
      const startsWithDelete =
        /^(delete|remove|clear|drop|erase|trash|wipe|rm|clr|rmv)\b/i.test(
          input
        );
      if (startsWithCreate && !startsWithDelete) {
        console.log(
          `⚖️ [TaskUnderstanding] Both matched; preferring CREATE due to sentence start`
        );
        return this.handleCreateRequest(input);
      }
      if (startsWithDelete && !startsWithCreate) {
        console.log(
          `⚖️ [TaskUnderstanding] Both matched; preferring DELETE due to sentence start`
        );
        return this.handleDeleteRequest(input);
      }
      // If ambiguous, keep original order but ensure explicit delete verb exists
      if (/\bdelete|remove|clear|drop|erase|trash|wipe\b/i.test(input)) {
        console.log(
          `⚖️ [TaskUnderstanding] Both matched; explicit DELETE verb found`
        );
        return this.handleDeleteRequest(input);
      } else {
        console.log(
          `⚖️ [TaskUnderstanding] Both matched; treating as CREATE due to lack of explicit DELETE verb`
        );
        return this.handleCreateRequest(input);
      }
    }

    // Try each handler in order
    if (deleteResult) {
      console.log(`🗑️ [TaskUnderstanding] ✅ Classified as DELETE request`);
      return this.handleDeleteRequest(input);
    }
    if (createResult) {
      console.log(`➕ [TaskUnderstanding] ✅ Classified as CREATE request`);
      return this.handleCreateRequest(input);
    }
    if (this.isNavigateRequest(input)) {
      console.log(`🧭 [TaskUnderstanding] Classified as NAVIGATE request`);
      return this.handleNavigateRequest(input);
    }
    if (this.isAnalyzeRequest(input)) {
      console.log(`🔍 [TaskUnderstanding] Classified as ANALYZE request`);
      return this.handleAnalyzeRequest(input);
    }
    if (this.isConvertRequest(input)) {
      console.log(`🔄 [TaskUnderstanding] Classified as CONVERT request`);
      return this.handleConvertRequest(input);
    }
    if (this.isSearchRequest(input)) {
      console.log(`🔍 [TaskUnderstanding] Classified as SEARCH request`);
      return this.handleSearchRequest(input);
    }
    if (this.isUpdateRequest(input)) {
      console.log(`✏️ [TaskUnderstanding] Classified as UPDATE request`);
      return this.handleUpdateRequest(input);
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

    const createWords = ["create", "make", "generate", "add", "new", "build"];

    // Check for explicit create words
    const hasCreateWord = createWords.some((word) => input.includes(word));
    console.log(`🧪 [TaskUnderstanding] Has create word: ${hasCreateWord}`);
    if (hasCreateWord) {
      console.log(
        `🧪 [TaskUnderstanding] ✅ RETURNING TRUE for CREATE (explicit word)`
      );
      return true;
    }

    // Check for implicit creation patterns
    // Pattern: "N flashcards/cards/notes" suggests creation (handle typos like "flashcarddd")
    const numberPattern = /\d+\s*(?:flashcard|card|note|flash)/i;
    const hasNumberPattern = input.match(numberPattern);
    console.log(
      `🧪 [TaskUnderstanding] Number pattern match: ${
        hasNumberPattern ? `YES: "${hasNumberPattern[0]}"` : "NO"
      }`
    );
    console.log(
      `🧪 [TaskUnderstanding] Testing pattern /\\d+\\s*(?:flashcard|card|note|flash)/i against: "${input}"`
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
    const hasCardPattern = input.match(/(?:flashcard|card|note|flash)/i);
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
    // Try to extract a topic for scoped deletions (e.g., "about X", "related to X")
    const topic = this.extractTopicForDelete(input);

    // Check what to delete
    if (input.includes("all") || input.includes("everything")) {
      if (this.matchesNotes(input) || this.matchesFlashcards(input)) {
        // Delete specific types
        if (this.matchesNotes(input)) {
          actions.push({
            type: "delete",
            target: "notes",
            priority: "high",
            data: topic ? { topic } : undefined,
          });
        }
        if (this.matchesFlashcards(input)) {
          actions.push({
            type: "delete",
            target: "flashcards",
            priority: "high",
            data: topic ? { topic } : undefined,
          });
        }
      } else {
        // Delete everything
        actions.push({
          type: "delete",
          target: "all",
          priority: "high",
          data: topic ? { topic } : undefined,
        });
      }
    } else {
      // Delete specific items
      if (this.matchesNotes(input)) {
        actions.push({
          type: "delete",
          target: "notes",
          priority: "medium",
          data: topic ? { topic } : undefined,
        });
      }
      if (this.matchesFlashcards(input)) {
        actions.push({
          type: "delete",
          target: "flashcards",
          priority: "medium",
          data: topic ? { topic } : undefined,
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

    // Parse multiple tasks from input like "10 flashcards of react and 1 note for car"
    const taskSegments = this.parseMultipleTasks(input);

    for (const segment of taskSegments) {
      console.log(`🔍 [TaskUnderstanding] Processing segment: "${segment}"`);

      // Check what to create in this segment (handle typos)
      if (segment.match(/note/i)) {
        const hasCount = this.hasExplicitCountInSegment(segment);
        const topic = this.extractTopicFromSegment(segment);
        console.log(
          `📝 [TaskUnderstanding] Notes - topic: "${topic}", hasCount: ${hasCount}`
        );

        const data: any = { topic };
        if (hasCount) {
          const count = this.extractCountFromSegment(segment);
          data.count = count;
          console.log(`📝 [TaskUnderstanding] Notes - count: ${count}`);
        }

        actions.push({
          type: "create",
          target: "notes",
          data,
          priority: "high",
        });
      }

      if (segment.match(/(?:flashcard|card|flash)/i)) {
        const count = this.extractCountFromSegment(segment);
        const topic = this.extractTopicFromSegment(segment);
        console.log(
          `🎯 [TaskUnderstanding] Flashcards - topic: "${topic}", count: ${count}`
        );

        actions.push({
          type: "create",
          target: "flashcards",
          data: { topic, count },
          priority: "high",
        });
      }

      if (segment.includes("schedule") || segment.includes("reminder")) {
        actions.push({
          type: "create",
          target: "schedule",
          data: { task: this.extractTopicFromSegment(segment) },
          priority: "medium",
        });
      }
    }

    // Special handling for "notes and flashcards" or "flashcards and notes" patterns
    // If the input contains both but we didn't get both actions, add the missing one
    const hasNotesKeyword = /\bnotes?\b/i.test(input);
    const hasFlashcardsKeyword = /\b(?:flashcards?|cards?|flash)\b/i.test(
      input
    );
    const hasNotesAction = actions.some((a) => a.target === "notes");
    const hasFlashcardsAction = actions.some((a) => a.target === "flashcards");

    if (hasNotesKeyword && !hasNotesAction) {
      console.log(`📝 [TaskUnderstanding] Adding missing notes action`);
      actions.push({
        type: "create",
        target: "notes",
        data: { topic: "general" },
        priority: "high",
      });
    }

    if (hasFlashcardsKeyword && !hasFlashcardsAction) {
      console.log(`🎯 [TaskUnderstanding] Adding missing flashcards action`);
      actions.push({
        type: "create",
        target: "flashcards",
        data: { topic: "general", count: 5 },
        priority: "high",
      });
    }

    // Fallback to old behavior if no segments were parsed
    if (actions.length === 0) {
      // Check what to create (old logic)
      if (input.includes("note")) {
        actions.push({
          type: "create",
          target: "notes",
          data: { topic: this.extractTopic(input) },
          priority: "high",
        });
      }

      if (input.includes("flashcard") || input.includes("card")) {
        const count = this.extractCount(input);
        actions.push({
          type: "create",
          target: "flashcards",
          data: { topic: this.extractTopic(input), count },
          priority: "high",
        });
      }

      if (input.includes("schedule") || input.includes("reminder")) {
        actions.push({
          type: "create",
          target: "schedule",
          data: { task: this.extractTopic(input) },
          priority: "medium",
        });
      }
    }

    return {
      actions,
      message: `I'll create the requested items.`,
      confidence: 0.8,
    };
  }

  private static handleSearchRequest(input: string): TaskRequest {
    const actions: TaskAction[] = [];

    if (input.includes("note")) {
      actions.push({ type: "search", target: "notes", priority: "medium" });
    }

    if (input.includes("flashcard") || input.includes("card")) {
      actions.push({
        type: "search",
        target: "flashcards",
        priority: "medium",
      });
    }

    if (input.includes("schedule") || input.includes("event")) {
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

    if (input.includes("note")) {
      actions.push({ type: "update", target: "notes", priority: "medium" });
    }

    if (input.includes("flashcard") || input.includes("card")) {
      actions.push({
        type: "update",
        target: "flashcards",
        priority: "medium",
      });
    }

    if (input.includes("schedule") || input.includes("event")) {
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

    // If it's just a target word, don't default to search, let the compound handler infer the action
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
    // Extract topic from input like "create notes about history" -> "history"
    const aboutMatch = input.match(/(?:about|on|for|of)\s+([^,.;]+)/i);
    if (aboutMatch) return aboutMatch[1].trim();

    // If no "about" found, take last meaningful word
    const words = input.split(/\s+/).filter((w) => w.length > 3);
    return words[words.length - 1] || "general";
  }

  private static extractCount(input: string): number {
    // Extract count from input like "5 flashcards" -> 5
    const countMatch = input.match(/(\d+)\s*(?:flashcard|card)/i);
    if (countMatch) return parseInt(countMatch[1]);
    return 5; // default
  }

  // New methods for handling multiple tasks
  private static parseMultipleTasks(input: string): string[] {
    // Split input by "and" to handle multiple tasks
    // Examples:
    // "10 flashcards of react and 1 note for car" -> ["10 flashcards of react", "1 note for car"]
    // "create notes about math and make 5 cards" -> ["create notes about math", "make 5 cards"]

    const segments = input.split(/\s+and\s+/i);

    // If we only have one segment, try splitting by comma as well
    if (segments.length === 1) {
      const commaSegments = input.split(/\s*,\s*/);
      if (commaSegments.length > 1) {
        return commaSegments;
      }
    }

    return segments;
  }

  private static extractTopicFromSegment(segment: string): string {
    // Extract topic from a segment like "10 flashcards of react" -> "react"
    // or "1 note for car" -> "car" or "12 flashcard off react" -> "react"

    // Try "of", "about", "for", "on", "off" patterns (enhanced for typos)
    const patterns = [
      // Handle "related" patterns without/with "to": capture the phrase after it
      /related(?:\s+to)?\s+([^,.;]+)/i,
      /(?:of|about|for|on|off)\s+([^,.;]+)/i,
      /(?:flashcard|card|note)(?:s?)\s+(?:of|about|for|on|off)\s+([^,.;]+)/i,
      // Handle pattern like "12 flashcard off react"
      /\d+\s+(?:flashcard|card|note)(?:s?)\s+(?:of|about|for|on|off)\s+([^,.;]+)/i,
    ];

    for (const pattern of patterns) {
      const match = segment.match(pattern);
      if (match) return match[1].trim();
    }

    // Try pattern without preposition: "flashcard react" -> "react"
    // Prefer words after artifact; if it contains 'related', skip the 'related' token
    const directMatch = segment.match(
      /(?:flashcard|card|note)(?:s?)\s+([^,.;]+)/i
    );
    if (directMatch) {
      const raw = directMatch[1].trim();
      const rel = raw.match(/^related\s+(.+)/i);
      return (rel ? rel[1] : raw).trim();
    }

    // Fallback: take last meaningful word
    const words = segment
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 2 &&
          !/^\d+$/.test(w) &&
          !/(flashcard|card|note|make|create|add)/i.test(w)
      );
    return words[words.length - 1] || "general";
  }

  // Heuristic: does this segment look like a continuation of a create command?
  private static looksLikeCreateContinuation(segment: string): boolean {
    const s = segment.toLowerCase();
    // has an explicit count or a number word
    const hasCount =
      /(^|\s)\d+(\s|$)/.test(s) ||
      /(one|two|three|four|five|six|seven|eight|nine|ten)/i.test(s);
    // has a topic cue without explicit delete words
    const hasTopicCue = /(related|about|on|of|for)/i.test(s);
    const hasDeleteCue =
      /(delete|remove|clear|drop|erase|trash|wipe|rm|clr|rmv)/i.test(s);
    // Also accept if it mentions an artifact implicitly
    const hasArtifact = /(flash|card|note|flashcard)/i.test(s);
    return !hasDeleteCue && (hasCount || hasTopicCue || hasArtifact);
  }

  private static extractCountFromSegment(segment: string): number {
    // Extract count from segment like "10 flashcards of react" -> 10 or "12 flashcard off react" -> 12
    const countMatch = segment.match(/(\d+)\s*(?:flashcard|card|flash|note)/i);
    if (countMatch) return parseInt(countMatch[1]);

    // Look for standalone numbers at the beginning
    const standaloneMatch = segment.match(/^(\d+)\s/);
    if (standaloneMatch) return parseInt(standaloneMatch[1]);

    // If no specific count found, check for number words
    const numberWords: { [key: string]: number } = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      fifteen: 15,
      twenty: 20,
    };

    for (const [word, num] of Object.entries(numberWords)) {
      if (segment.toLowerCase().includes(word)) {
        return num;
      }
    }

    return 5; // default
  }

  private static hasExplicitCountInSegment(segment: string): boolean {
    // True only if the user actually specified a number or number word alongside an artifact keyword
    if (/(\d+)\s*(?:flashcard|card|flash|note)/i.test(segment)) return true;
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
    return numberWords.some((w) => new RegExp(`\\b${w}\\b`, "i").test(segment));
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
    return navWords.some((phrase) => input.includes(phrase));
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
    return analyzeWords.some((phrase) => input.includes(phrase));
  }

  // Convert request detection (like notes to flashcards)
  private static isConvertRequest(input: string): boolean {
    return (
      (input.includes("from") || input.includes("convert")) &&
      (this.matchesNotes(input) || this.matchesFlashcards(input)) &&
      (input.includes("make") ||
        input.includes("create") ||
        input.includes("generate"))
    );
  }

  // Handle navigation requests
  private static handleNavigateRequest(input: string): TaskRequest {
    const actions: TaskAction[] = [];

    // Detect what page/section to navigate to
    if (input.includes("dashboard") || input.includes("home")) {
      actions.push({
        type: "navigate",
        target: "page",
        data: { page: "dashboard" },
        priority: "high",
      });
    } else if (input.includes("flashcard") || input.includes("card")) {
      actions.push({
        type: "navigate",
        target: "page",
        data: { page: "flashcards" },
        priority: "high",
      });
    } else if (input.includes("note")) {
      actions.push({
        type: "navigate",
        target: "page",
        data: { page: "notes" },
        priority: "high",
      });
    } else if (input.includes("schedule") || input.includes("calendar")) {
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

    if (this.matchesNotes(input)) {
      actions.push({ type: "analyze", target: "notes", priority: "high" });
    }
    if (this.matchesFlashcards(input)) {
      actions.push({ type: "analyze", target: "flashcards", priority: "high" });
    }
    if (input.includes("schedule") || input.includes("calendar")) {
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

    if (this.matchesNotes(input) && this.matchesFlashcards(input)) {
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

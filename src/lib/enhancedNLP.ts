// Enhanced Natural Language Processing for Universal Command Understanding
// Handles grammar errors, typos, and flexible syntax variations

export interface TextCorrectionResult {
  correctedText: string;
  corrections: Array<{
    original: string;
    corrected: string;
    type: "typo" | "grammar" | "expansion";
  }>;
  confidence: number;
}

export class EnhancedNLPProcessor {
  // Common typos and variations for educational commands
  private readonly corrections = new Map([
    // Action verbs
    ["mke", "make"],
    ["maek", "make"],
    ["amke", "make"],
    ["mkae", "make"],
    ["ceate", "create"],
    ["creat", "create"],
    ["crate", "create"],
    ["crete", "create"],
    ["generat", "generate"],
    ["generae", "generate"],
    ["generte", "generate"],

    // Content types
    ["flashcard", "flashcards"],
    ["flashcrads", "flashcards"],
    ["flashcrads", "flashcards"],
    ["flshcards", "flashcards"],
    ["flash card", "flashcards"],
    ["flash cards", "flashcards"],
    ["flashcrd", "flashcards"],
    ["note", "notes"],
    ["notez", "notes"],
    ["nte", "notes"],
    ["nots", "notes"],
    ["schedule", "schedule"],
    ["shedule", "schedule"],
    ["scedule", "schedule"],
    ["chedule", "schedule"],
    ["schedual", "schedule"],

    // Prepositions
    ["abot", "about"],
    ["abou", "about"],
    ["abut", "about"],
    ["bout", "about"],
    ["frm", "from"],
    ["fro", "from"],
    ["form", "from"],
    ["fo", "for"],
    ["ofr", "for"],
    ["fr", "for"],

    // Numbers written as words
    ["fity", "fifty"],
    ["fourty", "forty"],
    ["thrity", "thirty"],
    ["twenty", "twenty"],
    ["ten", "10"],
    ["twenty", "20"],
    ["thirty", "30"],
    ["forty", "40"],
    ["fifty", "50"],
    ["sixty", "60"],
    ["seventy", "70"],
    ["eighty", "80"],
    ["ninety", "90"],
    ["hundred", "100"],

    // Subject areas (common typos)
    ["javascript", "JavaScript"],
    ["javascrip", "JavaScript"],
    ["javasript", "JavaScript"],
    ["javscript", "JavaScript"],
    ["phyics", "physics"],
    ["physic", "physics"],
    ["chemestry", "chemistry"],
    ["chemisty", "chemistry"],
    ["matematics", "mathematics"],
    ["mathematic", "mathematics"],
    ["biologey", "biology"],
    ["biologi", "biology"],
  ]);

  // Grammar patterns to fix
  private readonly grammarPatterns = [
    // Missing articles - but only add 's' if the word doesn't already end in 's'
    {
      pattern: /\b(make|create|generate)\s+(flashcard)(?!s)\b/gi,
      replacement: "$1 $2s",
    },
    {
      pattern: /\b(make|create|generate)\s+(note)(?!s)\b/gi,
      replacement: "$1 $2s",
    },
    {
      pattern: /\b(flashcard)(?!s)\s+(about|from|on|for)/gi,
      replacement: "$1s $2",
    },
    { pattern: /\b(note)(?!s)\s+(about|from|on|for)/gi, replacement: "$1s $2" },

    // Number separation fixes
    { pattern: /\b(create|make|generate)(\d+)/gi, replacement: "$1 $2" },
    {
      pattern: /\b(\d+)(flashcard|note|schedule)(?!s)\b/gi,
      replacement: "$1 $2s",
    },

    // Common abbreviations
    { pattern: /\bflashcrd\b/gi, replacement: "flashcards" },
    { pattern: /\bfcards\b/gi, replacement: "flashcards" },
    { pattern: /\bcards\b/gi, replacement: "flashcards" },

    // Subject variations
    { pattern: /\bjs\b/gi, replacement: "JavaScript" },
    { pattern: /\bmaths\b/gi, replacement: "mathematics" },
    { pattern: /\bcs\b/gi, replacement: "computer science" },
  ];

  // Command intent expansions
  private readonly intentExpansions = new Map([
    // Shortened commands
    ["make50flashcard", "make 50 flashcards"],
    ["create40cards", "create 40 flashcards"],
    ["generate30notes", "generate 30 notes"],

    // Casual language
    ["gimme", "give me"],
    ["lemme", "let me"],
    ["wanna", "want to"],
    ["gonna", "going to"],

    // Educational shortcuts
    ["hw", "homework"],
    ["assign", "assignment"],
    ["proj", "project"],
    ["exam", "examination"],
    ["quiz", "quiz"],
    ["test", "test"],
  ]);

  correctText(input: string): TextCorrectionResult {
    let correctedText = input.toLowerCase().trim();
    const corrections: Array<{
      original: string;
      corrected: string;
      type: "typo" | "grammar" | "expansion";
    }> = [];

    // Step 1: Fix common typos
    for (const [typo, correction] of this.corrections) {
      const typoRegex = new RegExp(`\\b${typo}\\b`, "gi");
      if (typoRegex.test(correctedText)) {
        const original = correctedText;
        correctedText = correctedText.replace(typoRegex, correction);
        if (original !== correctedText) {
          corrections.push({
            original: typo,
            corrected: correction,
            type: "typo",
          });
        }
      }
    }

    // Step 2: Apply grammar pattern fixes
    for (const pattern of this.grammarPatterns) {
      const original = correctedText;
      correctedText = correctedText.replace(
        pattern.pattern,
        pattern.replacement
      );
      if (original !== correctedText) {
        corrections.push({
          original: original,
          corrected: correctedText,
          type: "grammar",
        });
      }
    }

    // Step 3: Expand intent shortcuts
    for (const [shortcut, expansion] of this.intentExpansions) {
      const shortcutRegex = new RegExp(`\\b${shortcut}\\b`, "gi");
      if (shortcutRegex.test(correctedText)) {
        const original = correctedText;
        correctedText = correctedText.replace(shortcutRegex, expansion);
        if (original !== correctedText) {
          corrections.push({
            original: shortcut,
            corrected: expansion,
            type: "expansion",
          });
        }
      }
    }

    // Step 4: Handle concatenated commands like "create50flashcard"
    correctedText = this.separateConcatenatedCommands(
      correctedText,
      corrections
    );

    // Step 5: Normalize spacing and punctuation
    correctedText = correctedText
      .replace(/\s+/g, " ") // Multiple spaces to single space
      .replace(/([.,!?])\s*$/, "") // Remove trailing punctuation
      .trim();

    // Calculate confidence based on number of corrections needed
    const confidence = Math.max(0.5, 1 - corrections.length * 0.1);

    return {
      correctedText,
      corrections,
      confidence,
    };
  }

  private separateConcatenatedCommands(
    text: string,
    corrections: Array<any>
  ): string {
    // Pattern: verb + number + noun (e.g., "create50flashcard")
    const concatenatedPattern =
      /\b(make|create|generate)(\d+)(flashcard|note|schedule|card)s?\b/gi;

    return text.replace(concatenatedPattern, (match, verb, number, noun) => {
      corrections.push({
        original: match,
        corrected: `${verb} ${number} ${noun}s`,
        type: "grammar",
      });
      return `${verb} ${number} ${noun}s`;
    });
  }

  // Enhanced fuzzy matching for command recognition
  fuzzyMatch(input: string, targets: string[], threshold = 0.7): string | null {
    const normalizedInput = input.toLowerCase().trim();

    for (const target of targets) {
      const similarity = this.calculateSimilarity(
        normalizedInput,
        target.toLowerCase()
      );
      if (similarity >= threshold) {
        return target;
      }
    }

    return null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Context-aware command completion
  suggestCompletions(partialInput: string): string[] {
    const suggestions = [];
    const input = partialInput.toLowerCase().trim();

    // Common command patterns
    const commandTemplates = [
      "create {number} flashcards about {topic}",
      "make notes about {topic}",
      "generate {difficulty} flashcards from {topic}",
      "build a schedule for {timeframe}",
      "create study materials for {subject}",
      "make {number} {difficulty} flashcards on {topic}",
    ];

    // Subject suggestions
    const commonSubjects = [
      "JavaScript",
      "Python",
      "React",
      "Node.js",
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "History",
      "Literature",
      "Economics",
      "Psychology",
      "Computer Science",
      "Data Science",
      "Machine Learning",
    ];

    // If input contains partial command words, suggest completions
    if (input.includes("flashcard") || input.includes("card")) {
      suggestions.push(
        "create 20 flashcards about JavaScript interview questions",
        "make advanced flashcards from machine learning concepts",
        "generate 50 beginner flashcards on mathematics"
      );
    }

    if (input.includes("note")) {
      suggestions.push(
        "make notes about Python programming",
        "create study notes from this lecture",
        "generate comprehensive notes on data structures"
      );
    }

    if (input.includes("schedule")) {
      suggestions.push(
        "create a schedule for exam preparation",
        "build my study schedule for next week",
        "schedule assignment deadlines"
      );
    }

    // If input is very short, provide general suggestions
    if (input.length < 5) {
      suggestions.push(
        "create 30 flashcards about JavaScript",
        "make notes on algorithms and data structures",
        "build a study schedule for finals week"
      );
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  // Intent confidence scoring
  calculateIntentConfidence(
    originalInput: string,
    correctedInput: string,
    detectedDomain: string
  ): number {
    let confidence = 0.8; // Base confidence

    // Reduce confidence for each correction needed
    const corrections = this.correctText(originalInput).corrections;
    confidence -= corrections.length * 0.05;

    // Boost confidence for clear domain indicators
    const domainKeywords = {
      flashcards: ["flashcard", "card", "quiz", "practice", "memorize"],
      notes: ["note", "summary", "study", "learn", "document"],
      schedule: [
        "schedule",
        "calendar",
        "plan",
        "exam",
        "assignment",
        "deadline",
      ],
    };

    const keywords =
      domainKeywords[detectedDomain as keyof typeof domainKeywords] || [];
    const keywordMatches = keywords.filter((keyword) =>
      correctedInput.toLowerCase().includes(keyword)
    ).length;

    confidence += keywordMatches * 0.1;

    // Ensure confidence stays within bounds
    return Math.max(0.3, Math.min(1.0, confidence));
  }
}

// Create a singleton instance for global use
export const nlpProcessor = new EnhancedNLPProcessor();

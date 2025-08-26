// AI client using OpenRouter only (via proxy)
// Env vars (Vite): OPENROUTER_MODEL (optional; API key is server-side only)
// Client model override (optional). If not set, the server decides.
// At runtime, a user can set localStorage.clientModel to override without rebuild.
const ENV_MODEL = (import.meta as any)?.env?.VITE_OPENROUTER_MODEL || "";
function getRuntimeModel(): string {
  try {
    const ls = (window as any)?.localStorage?.getItem("clientModel") || "";
    return (ls || ENV_MODEL || "").trim();
  } catch {
    return (ENV_MODEL || "").trim();
  }
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CallOptions =
  | { retries?: number; model?: string; timeoutMs?: number }
  | number
  | undefined;

export async function callOpenRouter(
  messages: ChatMessage[],
  optionsOrRetries?: CallOptions
): Promise<string> {
  const retries =
    typeof optionsOrRetries === "number"
      ? optionsOrRetries
      : optionsOrRetries && typeof optionsOrRetries === "object"
      ? optionsOrRetries.retries ?? 2
      : 2;
  // Determine candidate proxy URLs based on environment
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const devPort = (import.meta as any)?.env?.VITE_PROXY_PORT || 5174;
  const devProxy = `http://localhost:${devPort}/api/openrouter/chat`;
  const prodRelative = `/api/openrouter/chat`;
  const prodBase = (import.meta as any)?.env?.VITE_PROD_URL?.replace(/\/$/, "");
  const prodAbsolute = prodBase ? `${prodBase}/api/openrouter/chat` : "";

  const candidates = (
    isLocal
      ? [devProxy, prodAbsolute, prodRelative]
      : [prodRelative, prodAbsolute]
  ).filter(Boolean);

  const RUNTIME_MODEL = ((): string => {
    // Prefer explicit per-call model, else runtime override/env
    if (
      optionsOrRetries &&
      typeof optionsOrRetries === "object" &&
      optionsOrRetries.model &&
      String(optionsOrRetries.model).trim()
    ) {
      return String(optionsOrRetries.model).trim();
    }
    return getRuntimeModel();
  })();
  console.log(
    `[AI] Endpoint candidates (client model override: ${
      RUNTIME_MODEL || "<none>"
    }):`,
    candidates
  );
  // timeout resolution (env -> option -> default)
  const envTimeout = Number(
    (window as any).VITE_AI_TIMEOUT_MS ||
      (import.meta as any)?.env?.VITE_AI_TIMEOUT_MS ||
      0
  );
  const optTimeout =
    optionsOrRetries && typeof optionsOrRetries === "object"
      ? Number((optionsOrRetries as any).timeoutMs || 0)
      : 0;
  const effectiveTimeout = (optTimeout || envTimeout || 20000) as number;

  const tryCall = async (url: string) => {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        options: {
          max_tokens: 3000,
          temperature: 0.1,
          top_p: 0.8,
          // Only include model when explicitly configured
          ...(RUNTIME_MODEL ? { model: RUNTIME_MODEL } : {}),
        },
      }),
    });
    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(
        `[OpenRouter] Proxy error @ ${url}:`,
        resp.status,
        errorText
      );
      const hint =
        resp.status === 401
          ? "Hint: try a different model (set localStorage.clientModel) or check server logs."
          : "";
      throw new Error(
        `Proxy error: ${resp.status} - ${errorText} ${hint}`.trim()
      );
    }
    const data = await resp.json();
    return (
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.delta?.content ||
      ""
    );
  };
  // Try each candidate with simple timeout at fetch-level via AbortController
  for (const url of candidates) {
    for (let i = 0; i < retries; i++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), effectiveTimeout);
      try {
        const result = await tryCall(url);
        clearTimeout(timer);
        if (result && typeof result === "string") return result;
      } catch (err) {
        clearTimeout(timer);
        console.warn(`[AI] attempt ${i + 1} failed @ ${url}:`, err);
        await delay(200);
      }
    }
  }

  console.error("All AI endpoints failed, using fallback response");
  // Return a structured empty response based on the expected output
  if (messages.some((m) => m.content.includes("flashcard"))) {
    return "[]";
  }
  if (messages.some((m) => m.content.includes("notes"))) {
    return "[]";
  }
  return ""; // Default empty response
}

// -------- Automatic model routing --------
// Note: Model IDs are best-effort; if unavailable under your key, server will fall back to default.
function pickModel(kind: string, sample?: string): string {
  const s = (sample || "").toLowerCase();
  // Simple language hint for Indic scripts
  const isIndic =
    /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF]/.test(
      sample || ""
    );

  // Preferred free models mapping per task (avoid Google AI Studio models for system prompts)
  const map: Record<string, string[]> = {
    chat: [
      "mistralai/mistral-7b-instruct:free", // supports system prompts well
      "microsoft/wizardlm-2-8x22b:free",
      "meta-llama/llama-3.1-8b-instruct:free",
    ],
    analyze: [
      "mistralai/mistral-7b-instruct:free", // fast, supports system prompts
      "microsoft/wizardlm-2-8x22b:free",
      "meta-llama/llama-3.1-8b-instruct:free",
    ],
    notes: [
      "microsoft/wizardlm-2-8x22b:free", // long context, structured outputs
      "mistralai/mistral-7b-instruct:free",
      "meta-llama/llama-3.1-8b-instruct:free",
    ],
    schedule: [
      "mistralai/mistral-7b-instruct:free", // extraction-friendly, supports system prompts
      "microsoft/wizardlm-2-8x22b:free",
      "meta-llama/llama-3.1-8b-instruct:free",
    ],
    timetable: [
      "mistralai/mistral-7b-instruct:free", // best for structured parsing
      "microsoft/wizardlm-2-8x22b:free",
      "meta-llama/llama-3.1-8b-instruct:free",
    ],
    flashcards: [
      "mistralai/mistral-7b-instruct:free", // instruction-tuned, clean JSON, supports system prompts
      "microsoft/wizardlm-2-8x22b:free",
      "meta-llama/llama-3.1-8b-instruct:free",
    ],
    fun: [
      // language-aware choice (avoid Google models for system prompt compatibility)
      ...(isIndic
        ? ["mistralai/mistral-7b-instruct:free", "microsoft/wizardlm-2-8x22b:free"]
        : ["mistralai/mistral-7b-instruct:free", "microsoft/wizardlm-2-8x22b:free"]),
      "meta-llama/llama-3.1-8b-instruct:free",
    ],
  };

  const candidates = map[kind] || [];
  const explicit = getRuntimeModel();
  // Honor explicit override if set
  if (explicit) return explicit;
  return candidates[0] || ""; // empty -> server default
}

// ----------------- Helpers for fallback notes -----------------
function sanitize(text: string) {
  return text
    .replace(/Page\s+\d+\s*:?/gi, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\x20-\x7E\s]/g, "")
    .trim();
}

function detectSmartCategory(content: string, fileName: string) {
  const lower = (content + " " + fileName).toLowerCase();
  const pairs: Array<[string, string[]]> = [
    [
      "DevOps",
      ["devops", "deployment", "ci/cd", "docker", "kubernetes", "jenkins"],
    ],
    [
      "Programming",
      [
        "programming",
        "code",
        "algorithm",
        "variable",
        "function",
        "react",
        "javascript",
      ],
    ],
    [
      "Data Science",
      [
        "data science",
        "machine learning",
        "statistics",
        "model",
        "dataset",
        "ai",
      ],
    ],
    [
      "Web Development",
      ["web", "html", "css", "javascript", "frontend", "backend"],
    ],
    ["Database", ["database", "sql", "mongodb", "index", "query"]],
    ["Cloud Computing", ["cloud", "aws", "azure", "gcp", "serverless"]],
  ];
  for (const [name, keys] of pairs)
    if (keys.some((k) => lower.includes(k))) return name;
  return "General";
}

function extractSmartTags(content: string, fileName: string) {
  const tags = new Set<string>();
  const lower = content.toLowerCase();
  tags.add(fileName.replace(/\.[^/.]+$/, "").toLowerCase());
  [
    "devops",
    "docker",
    "kubernetes",
    "jenkins",
    "ansible",
    "programming",
    "algorithm",
    "database",
    "sql",
    "mongodb",
    "html",
    "css",
    "javascript",
    "react",
    "node",
    "cloud",
    "aws",
    "azure",
    "gcp",
    "security",
    "encryption",
    "ai",
    "ml",
    "data",
    "analytics",
    "statistics",
  ].forEach((t) => lower.includes(t) && tags.add(t));
  (content.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [])
    .slice(0, 3)
    .forEach((w) => w.length > 3 && tags.add(w.toLowerCase()));
  return Array.from(tags).slice(0, 5);
}

function createStructuredContent(content: string, fileName: string) {
  const clean = sanitize(content);
  const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const keyPoints = sentences
    .slice(0, 8)
    .map((s) => `- ${s.trim()}`)
    .join("\n");
  return `# ${fileName
    .replace(/\.[^/.]+$/, "")
    .replace(
      /[_-]/g,
      " "
    )}\n\n## 🎯 Key Concepts\n${keyPoints}\n\n## 📝 Summary\n${
    sentences.slice(0, 2).join(". ").trim() || "Summary not available."
  }`;
}

function ensureStructure(md: string, fileName: string, content: string) {
  const hasKey = /##\s*[🎯]?[\s-]*Key Concepts/i.test(md);
  const hasSummary = /##\s*[📝]?[\s-]*Summary/i.test(md);
  if (hasKey && hasSummary) return md;
  const fallback = createStructuredContent(content, fileName);
  return `${md.trim()}\n\n${fallback}`;
}

function ensureProperFormatting(
  content: string,
  fileName: string,
  source: string
): string {
  if (!content || content.trim().length === 0) {
    return createStructuredContent(source, fileName);
  }

  // Fix common formatting issues
  let formatted = content
    // Ensure proper line breaks between sections
    .replace(/##([^#\n])/g, "\n\n## $1")
    .replace(/###([^#\n])/g, "\n\n### $1")
    // Fix paragraph spacing
    .replace(/\n([^#\n-•\*\d])/g, "\n\n$1")
    // Fix list formatting
    .replace(/\n-\s*/g, "\n- ")
    .replace(/\n•\s*/g, "\n• ")
    .replace(/\n\*\s*/g, "\n• ")
    // Clean up excessive line breaks
    .replace(/\n{3,}/g, "\n\n")
    // Ensure proper spacing after headings
    .replace(/(#+\s*[^\n]+)\n([^#\n])/g, "$1\n\n$2")
    // Fix bold formatting
    .replace(/\*\*([^*]+)\*\*/g, "**$1**")
    .trim();

  // If content is still poorly formatted, enhance it
  if (!formatted.includes("##") || formatted.split("\n\n").length < 3) {
    const enhanced = enhanceContentStructure(formatted, fileName);
    return enhanced;
  }

  return formatted;
}

function enhanceContentStructure(content: string, fileName: string): string {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  const title = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Group content into sections
  const sections = [];
  let currentSection = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.match(/^#+\s/) ||
      (trimmed.length < 60 && trimmed.includes(":"))
    ) {
      if (currentSection.length > 0) {
        sections.push(currentSection.join("\n"));
        currentSection = [];
      }
      sections.push(trimmed.replace(/^#+\s*/, "## ").replace(":", ""));
    } else {
      currentSection.push(trimmed);
    }
  }

  if (currentSection.length > 0) {
    sections.push(currentSection.join("\n\n"));
  }

  // Build structured content
  let structured = `# ${title}\n\n`;

  if (sections.length > 0) {
    structured += `## Overview\n\n${
      sections[0] || "Overview of the content."
    }\n\n`;
  }

  if (sections.length > 1) {
    structured += `## Key Concepts\n\n${sections
      .slice(1, 3)
      .map((s) =>
        s
          .split(/[.!?]+/)
          .filter((sent) => sent.trim().length > 10)
          .slice(0, 3)
          .map((sent) => `• ${sent.trim()}`)
          .join("\n")
      )
      .join("\n\n")}\n\n`;
  }

  if (sections.length > 3) {
    structured += `## Detailed Content\n\n${sections
      .slice(3)
      .join("\n\n")}\n\n`;
  }

  structured += `## Summary\n\nThis document covers important concepts related to ${title.toLowerCase()}. Review the sections above for comprehensive understanding.`;

  return structured;
}

function createEnhancedFallbackNotes(content: string, fileName: string) {
  const clean = sanitize(content);
  if (clean.length < 50) {
    return [
      {
        title: `Study Notes: ${fileName}`,
        content: `# Document Summary\n\n${clean}\n\n> **Note:** This document contains limited content. Consider adding more details for comprehensive study notes.`,
        category: "General",
        tags: ["document", "review", "manual", "academic"],
      },
    ];
  }

  // Create structured academic notes following the same standards
  const title = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Extract basic structure from content
  const paragraphs = clean.split("\n\n").filter((p) => p.trim().length > 20);
  const potentialHeadings = extractPotentialHeadings(clean);
  const keyTerms = extractKeyTerms(clean);

  let structuredContent = `# Study Notes: ${title}\n\n`;

  // If we found clear structure, use it
  if (potentialHeadings.length > 0) {
    let currentSection = "";
    const lines = clean.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if this line is a heading
      const isHeading = potentialHeadings.some(
        (h) => h.includes(trimmedLine) || trimmedLine.includes(h)
      );

      if (isHeading && trimmedLine.length < 100) {
        if (currentSection) {
          structuredContent +=
            formatAcademicSection(currentSection) + "\n\n---\n\n";
        }
        structuredContent += `## ${trimmedLine}\n\n`;
        currentSection = "";
      } else {
        currentSection += trimmedLine + " ";
      }
    }

    // Add the last section
    if (currentSection) {
      structuredContent += formatAcademicSection(currentSection) + "\n\n";
    }
  } else {
    // No clear structure - create sections from paragraphs
    paragraphs.forEach((paragraph, index) => {
      const firstSentence = paragraph.split(".")[0] + ".";
      const sectionTitle =
        firstSentence.length < 80 ? firstSentence : `Section ${index + 1}`;

      structuredContent += `## ${sectionTitle}\n\n`;
      structuredContent += formatAcademicSection(paragraph) + "\n\n";

      if (index < paragraphs.length - 1) {
        structuredContent += "---\n\n";
      }
    });
  }

  // Add key terms section if found
  if (keyTerms.length > 0) {
    structuredContent += "## Key Terms and Concepts\n\n";
    keyTerms.forEach((term) => {
      structuredContent += `**${term}**: [Important concept mentioned in the source material]\n\n`;
    });
  }

  return [
    {
      title: `Study Notes: ${title}`,
      content: structuredContent.trim(),
      category: detectSmartCategory(content, fileName),
      tags: ["fallback-notes", "academic", "study-material", "structured"],
    },
  ];
}

// Helper functions for academic formatting
function extractPotentialHeadings(content: string): string[] {
  const headings: string[] = [];

  // Look for numbered items that might be headings
  const numbered = content.match(/^\d+\.?\s+([^.\n]{10,80})/gm);
  if (numbered) {
    headings.push(...numbered.map((h) => h.replace(/^\d+\.?\s+/, "")));
  }

  // Look for lines that end with colons (often headings)
  const colonEnded = content.match(/^([^:\n]{10,80}):\s*$/gm);
  if (colonEnded) {
    headings.push(...colonEnded.map((h) => h.replace(":", "")));
  }

  // Look for all-caps lines (might be headings)
  const allCaps = content.match(/^([A-Z\s]{10,80})$/gm);
  if (allCaps) {
    headings.push(...allCaps);
  }

  return headings.filter((h) => h.trim().length > 5);
}

function extractKeyTerms(content: string): string[] {
  const terms: Set<string> = new Set();

  // Extract capitalized terms
  const capitalized = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (capitalized) {
    capitalized.forEach((term) => {
      if (term.length > 4 && term.length < 40 && term.split(" ").length <= 3) {
        terms.add(term);
      }
    });
  }

  // Extract terms in quotes or bold
  const quoted = content.match(/"([^"]{4,40})"/g);
  if (quoted) {
    quoted.forEach((q) => terms.add(q.replace(/"/g, "")));
  }

  return Array.from(terms).slice(0, 15);
}

function formatAcademicSection(content: string): string {
  let formatted = content.trim();

  // Bold important terms (capitalize words)
  formatted = formatted.replace(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
    "**$1**"
  );

  // Create bullet points from sentence lists
  if (formatted.includes(".") && formatted.split(".").length > 3) {
    const sentences = formatted.split(".").filter((s) => s.trim().length > 10);
    if (sentences.length > 2) {
      formatted = sentences.map((s) => `- ${s.trim()}`).join("\n");
    }
  }

  return formatted;
}

// PDF-specific helper functions for comprehensive note extraction
function extractPDFStructuredSections(content: string): string[] {
  // Split content into logical sections based on PDF structure patterns
  const sections = [];

  // Look for numbered sections, headings, and clear topic breaks
  const patterns = [
    /(?:^|\n)\s*(?:\d+\.?\s+)?([A-Z][^.!?\n]*(?:Algorithm|Method|Protocol|System|Process|Principle|Concept|Definition))/gm,
    /(?:^|\n)\s*([A-Z][A-Z\s]{5,50})\s*(?:\n|$)/gm, // ALL CAPS headers
    /(?:^|\n)\s*(Chapter|Section|Unit|Topic)\s*\d*:?\s*([^.\n]+)/gim,
    /(?:^|\n)\s*([A-Z][^.\n]*?:)/gm, // Headers ending with colon
  ];

  // Split by clear section breaks first
  let currentSection = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this line is a section header
    const isHeader = patterns.some((pattern) => {
      pattern.lastIndex = 0; // Reset pattern
      return pattern.test(line);
    });

    if (isHeader && currentSection.length > 2) {
      sections.push(currentSection.join("\n"));
      currentSection = [line];
    } else {
      currentSection.push(line);
    }

    // Also break on significant content changes
    if (currentSection.length > 20 && line.length < 10) {
      sections.push(currentSection.join("\n"));
      currentSection = [];
    }
  }

  if (currentSection.length > 2) {
    sections.push(currentSection.join("\n"));
  }

  return sections.filter((s) => s.trim().length > 100);
}

function extractAllTopicsFromPDF(content: string): string[] {
  const topics = new Set<string>();

  // Enhanced patterns for PDF topic extraction
  const patterns = [
    /(?:^|\n)\s*(?:\d+\.?\s+)?([A-Z][^.!?\n]*(?:Algorithm|Method|Protocol|System|Process|Principle|Concept|Definition|Technique|Approach|Model))/gm,
    /(?:Topic|Subject|Chapter|Section|Unit)\s*\d*:?\s*([A-Z][^.\n]+)/gim,
    /(?:^|\n)\s*([A-Z][A-Z\s]{5,40})\s*(?:\n|$)/gm,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are|can be|refers to|means)/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const topic = match[1].trim();
      if (topic.length > 3 && topic.length < 60) {
        topics.add(topic);
      }
    }
  });

  return Array.from(topics).slice(0, 15);
}

function extractDefinitionsFromPDF(
  content: string
): Array<{ term: string; definition: string }> {
  const definitions = [];

  // Enhanced definition patterns for PDFs
  const patterns = [
    /\b([A-Z][a-zA-Z\s]{2,30})\s+(?:is|are|means?|refers?\s+to|can\s+be\s+defined\s+as|is\s+defined\s+as)\s+([^.!?]{20,200}[.!?])/g,
    /\b([A-Z]{2,})\s*[-:]?\s*([^.!?\n]{15,150}[.!?])/g,
    /(?:Definition|Def)\s*:?\s*([A-Z][^.!?\n]*?)\s*[-:]?\s*([^.!?\n]{20,200})/gi,
  ];

  patterns.forEach((pattern) => {
    let match;
    while (
      (match = pattern.exec(content)) !== null &&
      definitions.length < 12
    ) {
      const term = match[1].trim();
      const definition = match[2].trim();
      if (term.length > 2 && definition.length > 15) {
        definitions.push({ term, definition });
      }
    }
  });

  return definitions;
}

function extractAdvantagesDisadvantages(
  content: string
): Array<{ context: string; advantages: string[]; disadvantages: string[] }> {
  const results = [];

  // Find advantages and disadvantages sections
  const advPattern =
    /(?:Advantages?|Benefits?|Pros?)\s*:?\s*((?:[^.\n]*[.\n]){1,8})/gi;
  const disAdvPattern =
    /(?:Disadvantages?|Drawbacks?|Cons?|Limitations?)\s*:?\s*((?:[^.\n]*[.\n]){1,8})/gi;

  let advMatch;
  while ((advMatch = advPattern.exec(content)) !== null) {
    const advantages = advMatch[1]
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && s.length < 150)
      .slice(0, 5);

    if (advantages.length > 0) {
      results.push({ context: "General", advantages, disadvantages: [] });
    }
  }

  let disAdvMatch;
  while ((disAdvMatch = disAdvPattern.exec(content)) !== null) {
    const disadvantages = disAdvMatch[1]
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && s.length < 150)
      .slice(0, 5);

    if (disadvantages.length > 0) {
      // Try to match with existing context or create new
      const existingIndex = results.findIndex(
        (r) => r.advantages.length > 0 && r.disadvantages.length === 0
      );
      if (existingIndex >= 0) {
        results[existingIndex].disadvantages = disadvantages;
      } else {
        results.push({ context: "General", advantages: [], disadvantages });
      }
    }
  }

  return results;
}

function extractApplicationsFromPDF(
  content: string
): Array<{ context: string; application: string }> {
  const applications = [];

  const patterns = [
    /(?:Applications?|Uses?|Used\s+(?:in|for)|Examples?)\s*:?\s*((?:[^.\n]*[.\n]){1,6})/gi,
    /(?:applied\s+(?:in|to)|implemented\s+(?:in|for)|usage\s+(?:in|for))\s+([^.\n]{15,100})/gi,
  ];

  patterns.forEach((pattern) => {
    let match;
    while (
      (match = pattern.exec(content)) !== null &&
      applications.length < 8
    ) {
      const appText = match[1];
      const appList = appText
        .split(/[.\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10 && s.length < 120);

      appList.forEach((app) => {
        applications.push({ context: "Application", application: app });
      });
    }
  });

  return applications;
}

function extractSectionTitleFromPDF(section: string): string {
  const lines = section.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return "";

  // Look for clear title patterns
  const titlePatterns = [
    /^(?:\d+\.?\s+)?([A-Z][^.!?\n]*(?:Algorithm|Method|Protocol|System|Process|Principle|Concept|Definition))/,
    /^([A-Z][A-Z\s]{5,40})$/,
    /^(?:Chapter|Section|Unit|Topic)\s*\d*:?\s*([A-Z][^.\n]+)/i,
    /^([A-Z][^.\n]*?):$/,
  ];

  for (const line of lines.slice(0, 3)) {
    for (const pattern of titlePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
  }

  // Fallback to first meaningful line
  const firstLine = lines[0].trim();
  if (firstLine.length > 5 && firstLine.length < 60) {
    return firstLine;
  }

  return "";
}

function formatPDFSectionContent(section: string): string {
  // Format section content maintaining structure
  const lines = section.split("\n").filter((line) => line.trim().length > 0);

  // Skip title line and format content
  const contentLines = lines.slice(1);
  let formatted = "";

  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i].trim();

    // Skip if too short
    if (line.length < 5) continue;

    // Check if it's a definition, principle, or key point
    if (line.includes(":") && line.length < 100) {
      formatted += `**${line.replace(":", "")}**: `;
      // Add next line as definition if available
      if (i + 1 < contentLines.length) {
        formatted += `${contentLines[i + 1].trim()}\n\n`;
        i++; // Skip next line as we've used it
      } else {
        formatted += "\n\n";
      }
    } else if (line.match(/^(?:-|\*|\d+\.)/)) {
      // It's a list item
      formatted += `${line}\n`;
    } else {
      // Regular content
      formatted += `${line}\n\n`;
    }
  }

  return formatted.trim();
}
function extractComprehensiveContentSections(content: string): string[] {
  const sections = [];
  const sentences = content.split(/(?<=[.!?])\s+/);
  let currentSection = [];
  let currentTopic = "";

  for (const sentence of sentences) {
    const topicMatch = sentence.match(
      /^([A-Z][^.!?]*(?:Algorithm|Signature|Hash|Mining|Authentication|Consensus|Protocol|Method|System|Process))/
    );

    if (topicMatch && topicMatch[1] !== currentTopic) {
      if (currentSection.length > 0) {
        sections.push(currentSection.join(" "));
      }
      currentSection = [sentence];
      currentTopic = topicMatch[1];
    } else {
      currentSection.push(sentence);
      if (currentSection.length > 5) {
        sections.push(currentSection.join(" "));
        currentSection = [];
        currentTopic = "";
      }
    }
  }

  if (currentSection.length > 0) {
    sections.push(currentSection.join(" "));
  }

  return sections.filter((s) => s.trim().length > 100);
}

function extractAllTopics(content: string): string[] {
  const topics = new Set<string>();

  // Pattern matching for various topic indicators
  const patterns = [
    /(?:Unit|Chapter|Section)\s*[-:]?\s*([A-Z][^.!?]*?)(?:[.!?]|$)/gi,
    /^([A-Z][a-zA-Z\s]{3,30})(?:\s*[-:]|\n|$)/gm,
    /(?:Topic|Subject|Area)s?\s*(?:covered?|include[sd]?)?\s*:?\s*([A-Z][^.!?]*?)(?:[.!?]|$)/gi,
    /\b([A-Z][a-zA-Z\s]*(?:Algorithm|Protocol|Method|System|Process|Mechanism|Principle|Concept)s?)\b/g,
  ];

  patterns.forEach((pattern) => {
    const matches = content.match(pattern) || [];
    matches.forEach((match) => {
      const clean = match
        .replace(
          /^(?:Unit|Chapter|Section|Topic|Subject|Area)s?\s*[-:]?\s*/i,
          ""
        )
        .trim();
      if (clean.length > 5 && clean.length < 50) {
        topics.add(clean);
      }
    });
  });

  return Array.from(topics).slice(0, 10);
}

function extractDefinitions(
  content: string
): Array<{ term: string; definition: string }> {
  const definitions = [];

  // Pattern for definitions
  const patterns = [
    /([A-Z][a-zA-Z\s]{2,25})\s+(?:is|are|means?|refers?\s+to|can\s+be\s+defined\s+as)\s+([^.!?]{20,150}[.!?])/g,
    /([A-Z]{2,})\s*[-:]?\s*([^.!?]{15,100}[.!?])/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null && definitions.length < 8) {
      const term = match[1].trim();
      const definition = match[2].trim();
      if (term.length > 2 && definition.length > 15) {
        definitions.push({ term, definition });
      }
    }
  });

  return definitions;
}

function extractProcessesAndMethods(
  content: string
): Array<{ name: string; description: string }> {
  const processes = [];
  const patterns = [
    /([A-Z][a-zA-Z\s]*(?:Method|Process|Procedure|Algorithm|Technique))\s*[-:]?\s*([^.!?]{20,120}[.!?])/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null && processes.length < 6) {
      processes.push({
        name: match[1].trim(),
        description: match[2].trim(),
      });
    }
  });

  return processes;
}

function extractApplicationsAndExamples(
  content: string
): Array<{ context: string; example: string }> {
  const applications = [];
  const patterns = [
    /(?:used\s+in|applied\s+to|example\s+of|implementation\s+in)\s+([^.!?]{10,80})/gi,
    /(?:Bitcoin|Ethereum|blockchain|cryptocurrency|platform)\s+([^.!?]{15,100})/gi,
  ];

  patterns.forEach((pattern) => {
    let match;
    while (
      (match = pattern.exec(content)) !== null &&
      applications.length < 5
    ) {
      applications.push({
        context: "Application",
        example: match[1].trim(),
      });
    }
  });

  return applications;
}

function getTopicDescription(topic: string, content: string): string {
  const sentences = content.split(/[.!?]/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(topic.toLowerCase())) {
      const words = sentence.trim().split(" ");
      if (words.length > 5 && words.length < 25) {
        return words.slice(0, 15).join(" ") + (words.length > 15 ? "..." : "");
      }
    }
  }
  return "Key concept in the subject matter";
}

function getTermContext(term: string, content: string): string {
  const sentences = content.split(/[.!?]/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(term.toLowerCase())) {
      const clean = sentence.trim();
      if (clean.length > 30 && clean.length < 120) {
        return clean;
      }
    }
  }
  return "Important technical term in this context";
}

function formatComprehensiveSection(section: string): string {
  return (
    section
      .replace(/\s+/g, " ")
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 15)
      .slice(0, 6)
      .join(" ")
      .substring(0, 500) + (section.length > 500 ? "..." : "")
  );
}

function extractRelatedPoints(section: string): string[] {
  const sentences = section.split(/[.!?]/).filter((s) => s.trim().length > 20);
  return sentences
    .filter((s) => containsImportantKeywords(s))
    .slice(0, 4)
    .map((s) => s.trim().substring(0, 100) + (s.length > 100 ? "..." : ""));
}

function getAlgorithmDetails(
  algo: string,
  content: string
): { purpose: string; mechanism: string; advantages?: string } {
  const sections = content.split(/[.!?]/);
  let purpose = "Core algorithm/method in the system";
  let mechanism = "Implements specific computational process";
  let advantages = "";

  for (const section of sections) {
    if (section.toLowerCase().includes(algo.toLowerCase())) {
      if (section.includes("used") || section.includes("purpose")) {
        purpose = section.trim().substring(0, 80) + "...";
      }
      if (section.includes("works") || section.includes("algorithm")) {
        mechanism = section.trim().substring(0, 100) + "...";
      }
      if (section.includes("advantage") || section.includes("benefit")) {
        advantages = section.trim().substring(0, 80) + "...";
      }
    }
  }

  return { purpose, mechanism, advantages: advantages || undefined };
}

function extractCriticalPoints(content: string): string[] {
  const sentences = content.split(/[.!?]/).filter((s) => s.trim().length > 25);
  return sentences
    .filter((s) => {
      const lower = s.toLowerCase();
      return [
        "important",
        "crucial",
        "essential",
        "key",
        "critical",
        "significant",
        "main",
        "primary",
        "fundamental",
      ].some((keyword) => lower.includes(keyword));
    })
    .slice(0, 8)
    .map(
      (s) =>
        s.trim().replace(/\s+/g, " ").substring(0, 120) +
        (s.length > 120 ? "..." : "")
    );
}

function getMainConcept(topic: string, content: string): string {
  const sentences = content.split(/[.!?]/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(topic.toLowerCase())) {
      const words = sentence.trim().split(" ");
      if (words.length > 3) {
        return words.slice(0, 8).join(" ") + (words.length > 8 ? "..." : "");
      }
    }
  }
  return "Core concept for understanding";
}

function extractTechnicalTerms(content: string): string[] {
  const terms = new Set<string>();

  // Common blockchain/crypto terms
  const patterns = [
    /\b(Blockchain|Consensus|Algorithm|Cryptographic|Hash|Digital|Signature|Authentication|Encryption|Mining|Byzantine|Fault|Tolerance|Proof|Work|Stake|Authority|Identity|Elapsed|Time)\b/g,
    /\b[A-Z][A-Z]+\b/g, // Acronyms like PoW, PoS, etc.
    /\b[A-Z][a-z]+(?:[A-Z][a-z]*)+\b/g, // CamelCase terms
  ];

  patterns.forEach((pattern) => {
    const matches = content.match(pattern) || [];
    matches.forEach((match) => {
      if (match.length > 2 && match.length < 30) {
        terms.add(match);
      }
    });
  });

  return Array.from(terms).slice(0, 12);
}

function extractAlgorithms(content: string): string[] {
  const algorithms = [];
  const patterns = [
    /PoW[^a-z]*Proof of Work/gi,
    /PoS[^a-z]*Proof of Stake/gi,
    /DPoS[^a-z]*Delegated Proof of Stake/gi,
    /PoA[^a-z]*Proof of Authority/gi,
    /PoET[^a-z]*Proof of Elapsed Time/gi,
    /BFT[^a-z]*Byzantine Fault Tolerance/gi,
    /ECDSA[^a-z]*Elliptic Curve Digital Signature Algorithm/gi,
    /SHA-256/gi,
    /SHA-512/gi,
    /MD5/gi,
    /RIPEMD/gi,
    /Ethash/gi,
    /SCrypt/gi,
    /Schnorr/gi,
  ];

  patterns.forEach((pattern) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const clean = match.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
        if (clean.length > 2) {
          algorithms.push(clean);
        }
      });
    }
  });

  return [...new Set(algorithms)].slice(0, 10);
}

function extractSectionTitle(section: string): string {
  // Try to extract a meaningful title from the section
  const sentences = section.split(/[.!?]/);
  const firstSentence = sentences[0]?.trim();

  if (!firstSentence) return "";

  // Look for key terms that could be titles
  const titlePatterns = [
    /^([A-Z][^.!?]*(?:Algorithm|Signature|Hash|Mining|Authentication|Consensus|Primitive))/,
    /^([A-Z]{2,})/,
    /^([A-Z][a-zA-Z\s]{2,20})/,
  ];

  for (const pattern of titlePatterns) {
    const match = firstSentence.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback to first few words
  return firstSentence.split(" ").slice(0, 4).join(" ");
}

function formatSectionContent(section: string): string {
  // Clean up and format the section content
  return (
    section
      .replace(/\s+/g, " ")
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 10)
      .slice(0, 4)
      .join(" ")
      .substring(0, 400) + (section.length > 400 ? "..." : "")
  );
}

function containsImportantKeywords(sentence: string): boolean {
  const keywords = [
    "algorithm",
    "consensus",
    "cryptographic",
    "hash",
    "signature",
    "authentication",
    "mining",
    "byzantine",
    "proof",
    "security",
    "encryption",
    "integrity",
    "validation",
    "verification",
    "blockchain",
    "important",
    "crucial",
    "essential",
  ];

  const lower = sentence.toLowerCase();
  return (
    keywords.some((keyword) => lower.includes(keyword)) && sentence.length > 30
  );
}

async function condenseContentIfLarge(
  content: string,
  fileName: string
): Promise<string> {
  if (content.length < 8000) return content; // Process smaller files faster
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Extract key information from documents quickly. Focus on headings, important points, and core concepts. Be concise.",
    },
    {
      role: "user",
      content: `Extract key info from: ${fileName}\n\n${content.substring(
        0,
        20000
      )}`, // Reduced for speed
    },
  ];
  try {
    const out = await callOpenRouter(messages, {
      retries: 1,
      model: pickModel("analyze", content),
    });
    return out && out.trim().length > 50
      ? out.trim()
      : content.substring(0, 8000);
  } catch {
    return content.substring(0, 8000); // Quick fallback
  }
}

// Chunk large content for token limit management
function chunkContent(content: string, maxChunkSize: number = 8000): string[] {
  // Increased from 6000 to 8000
  if (content.length <= maxChunkSize) {
    return [content];
  }

  const chunks: string[] = [];
  const paragraphs = content.split("\n\n").filter((p) => p.trim());

  let currentChunk = "";
  let currentSize = 0;

  for (const paragraph of paragraphs) {
    const paragraphSize = paragraph.length;

    // If single paragraph is too large, split by sentences
    if (paragraphSize > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
        currentSize = 0;
      }

      const sentences = paragraph.split(/[.!?]+/).filter((s) => s.trim());
      let sentenceChunk = "";

      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > maxChunkSize) {
          if (sentenceChunk) chunks.push(sentenceChunk.trim());
          sentenceChunk = sentence + ".";
        } else {
          sentenceChunk += sentence + ".";
        }
      }
      if (sentenceChunk) chunks.push(sentenceChunk.trim());
      continue;
    }

    // If adding this paragraph exceeds limit, save current chunk and start new one
    if (currentSize + paragraphSize > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
        currentSize = paragraphSize;
      } else {
        chunks.push(paragraph);
      }
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      currentSize += paragraphSize;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 50); // Filter out tiny chunks
}

// Validate coverage by checking if all major topics are included
function validateCoverage(
  sourceContent: string,
  generatedNotes: any[]
): boolean {
  if (!generatedNotes || generatedNotes.length === 0) return false;

  // Extract potential topics from source (headings, numbered items, etc.)
  const sourceTopics = extractSourceTopics(sourceContent);
  const noteContent = generatedNotes
    .map((n) => n.content || "")
    .join(" ")
    .toLowerCase();

  let coveredTopics = 0;
  let totalTopics = sourceTopics.length;

  for (const topic of sourceTopics) {
    const topicVariations = [
      topic.toLowerCase(),
      topic.toLowerCase().replace(/[^\w\s]/g, ""),
      topic.toLowerCase().replace(/\s+/g, ""),
    ];

    const isCovered = topicVariations.some(
      (variation) => variation.length > 3 && noteContent.includes(variation)
    );

    if (isCovered) coveredTopics++;
  }

  const coveragePercentage =
    totalTopics > 0 ? (coveredTopics / totalTopics) * 100 : 100;
  console.log(
    `Coverage validation: ${coveredTopics}/${totalTopics} topics covered (${coveragePercentage.toFixed(
      1
    )}%)`
  );

  return coveragePercentage >= 50; // Reduced from 70% to 50% for faster processing with more lenient validation
}

// Extract major topics from source content
function extractSourceTopics(content: string): string[] {
  const topics: Set<string> = new Set();

  // Extract numbered items (1., 2., etc.)
  const numberedItems = content.match(/\d+\.\s+([^.\n]+)/g);
  if (numberedItems) {
    numberedItems.forEach((item) => {
      const topic = item.replace(/^\d+\.\s+/, "").trim();
      if (topic.length > 5 && topic.length < 100) {
        topics.add(topic);
      }
    });
  }

  // Extract potential headings (lines that are shorter and followed by explanations)
  const lines = content.split("\n").filter((line) => line.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1]?.trim();

    // Potential heading: short line followed by longer explanation
    if (
      line.length > 5 &&
      line.length < 80 &&
      nextLine &&
      nextLine.length > line.length * 1.5 &&
      !line.match(/^\d+\s/) && // Not just a number
      line.match(/[A-Z]/) && // Contains uppercase letters
      !line.endsWith(".")
    ) {
      topics.add(line);
    }
  }

  // Extract capitalized phrases that might be important concepts
  const concepts = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (concepts) {
    concepts.forEach((concept) => {
      if (
        concept.length > 5 &&
        concept.length < 50 &&
        concept.split(" ").length <= 4
      ) {
        topics.add(concept);
      }
    });
  }

  return Array.from(topics).slice(0, 50); // Limit to prevent overwhelming
}

// Process large content in chunks and combine results
async function processContentInChunks(
  content: string,
  fileName: string
): Promise<any[]> {
  const chunks = chunkContent(content);

  if (chunks.length === 1) {
    // Content fits in one chunk, process normally (not as a chunk)
    const notes = await generateSingleNoteFromContent(
      chunks[0],
      fileName,
      false
    );

    // Validate coverage for single chunk
    if (!validateCoverage(content, notes)) {
      console.warn("Coverage validation failed, enhancing with fallback");
      const fallbackNotes = await createEnhancedFallbackNotes(
        content,
        fileName
      );
      return [...notes, ...fallbackNotes];
    }

    return notes;
  }

  console.log(`Processing large content in ${chunks.length} chunks...`);

  const allNotes: any[] = [];
  const processedTopics: Set<string> = new Set();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkName = `${fileName} - Part ${i + 1} of ${chunks.length}`;
    const chunkInfo = `Processing chunk ${i + 1} of ${
      chunks.length
    } from "${fileName}". This is ${
      i === 0 ? "the first" : i === chunks.length - 1 ? "the final" : "a middle"
    } chunk.`;

    try {
      // Process as chunk-aware
      const chunkNotes = await generateSingleNoteFromContent(
        chunk,
        chunkName,
        true,
        chunkInfo
      );

      // Accept notes with minimal validation for speed
      if (chunkNotes && chunkNotes.length > 0) {
        allNotes.push(...chunkNotes);
      } else {
        console.warn(`No notes generated for chunk ${i + 1}, using fallback`);
        const fallbackNotes = await createEnhancedFallbackNotes(
          chunk,
          chunkName
        );
        allNotes.push(...fallbackNotes);
      }

      // Small delay to avoid rate limits
      if (i < chunks.length - 1) {
        await delay(200); // Reduced from 500ms to 200ms for faster processing
      }
    } catch (error) {
      console.warn(`Error processing chunk ${i + 1}:`, error);
      // Create fallback notes for failed chunks
      const fallbackNotes = await createEnhancedFallbackNotes(chunk, chunkName);
      allNotes.push(...fallbackNotes);
    }
  }

  // Final coverage check across all chunks
  if (!validateCoverage(content, allNotes)) {
    console.warn(
      "Final coverage validation failed, adding comprehensive summary"
    );
    const summaryNotes = await createEnhancedFallbackNotes(
      content,
      `${fileName} - Comprehensive Summary`
    );
    allNotes.push(...summaryNotes);
  }

  return allNotes;
}

// Generate notes from single chunk of content with chunk-aware prompting
async function generateSingleNoteFromContent(
  content: string,
  fileName: string,
  isChunk: boolean = false,
  chunkInfo?: string
): Promise<any[]> {
  // Quick processing for small files, condense only if really large
  const source = await condenseContentIfLarge(content, fileName);

  const systemPrompt = isChunk
    ? `You are an advanced academic note generator. Create detailed study notes from this document chunk.

SPEED & EFFICIENCY REQUIREMENTS:
- Process quickly - focus on extracting key information efficiently
- Create comprehensive but concise notes
- Use streamlined formatting

CONTENT REQUIREMENTS:
1. **Coverage**: Cover every topic in this chunk completely
2. **Details**: Include detailed explanations, examples, and important facts
3. **Flexible Structure**: For each topic, include what's relevant:
   - **Definition/Explanation** (always include if present)
   - **Key Details & Facts** (detailed coverage)
   - **Advantages/Benefits** (only if mentioned in source)
   - **Disadvantages/Limitations** (only if mentioned in source) 
   - **Applications/Examples** (if available)
   - **Important Notes** (any critical information)

FORMATTING:
- Use Markdown format
- Main topics: \`#\` headings
- Subtopics: \`##\` or \`###\`
- **Bold** key terms
- Bullet points for lists
- Detailed but organized content

OUTPUT: Return ONLY valid JSON:
[{"title": "Detailed Notes: [Topic]", "content": "[Detailed Markdown]", "category": "[Subject]", "tags": ["detailed-notes", "academic"]}]`
    : `You are an advanced academic note generator. Create comprehensive, detailed study notes from the provided content.

OPTIMIZATION REQUIREMENTS:
- Generate detailed, comprehensive notes efficiently
- Focus on thorough coverage with rich details
- Process all content systematically

CONTENT REQUIREMENTS:
1. **Complete Coverage**: Include every topic, subtopic, and important detail
2. **Detailed Explanations**: Provide thorough explanations with examples
3. **Flexible Formatting**: For each topic, include relevant elements:
   - **Definition/Concept** (detailed explanation)
   - **Key Details & Processes** (comprehensive coverage)
   - **Working Principles** (how things work)
   - **Advantages** (only if present in source material)
   - **Disadvantages** (only if present in source material)
   - **Applications/Examples** (real-world usage)
   - **Important Facts** (critical information to remember)

FORMATTING GUIDELINES:
- Use clear Markdown structure
- Main topics: \`#\` headings  
- Subtopics: \`##\` and \`###\` as needed
- **Bold** important terms and concepts
- Bullet points for detailed lists
- Rich, detailed content while maintaining readability

EFFICIENCY FOCUS:
- Prioritize comprehensive detail over brevity
- Include all relevant information from source
- Maintain academic rigor with detailed explanations

OUTPUT: Return ONLY valid JSON array:
[{"title": "Comprehensive Study Notes: [Topic]", "content": "[Detailed Markdown content]", "category": "[Subject Area]", "tags": ["comprehensive", "detailed", "academic"]}]`;

  const userContent = isChunk
    ? `Process this chunk and create notes following the chunk-aware requirements above. Return only valid JSON.

${chunkInfo || ""}

CHUNK CONTENT:
${content}`
    : `Create comprehensive study notes from this content following the exact requirements above. Return only valid JSON.

Source: "${fileName}"

CONTENT:
${content}`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userContent,
    },
  ];

  try {
    const response = await callOpenRouter(messages, {
      retries: 3,
      model: pickModel("notes", content),
    });

    // Two-step JSON handling to avoid markdown conflicts
    let clean = (response || "").trim();

    // First, try to extract JSON array
    const jsonArrayMatch = clean.match(/\[[\s\S]*?\]/);
    if (jsonArrayMatch) {
      try {
        const notes = JSON.parse(jsonArrayMatch[0]);
        if (Array.isArray(notes) && notes.length > 0) {
          return notes.map((n: any, i: number) => ({
            title:
              n?.title ||
              `Comprehensive Notes from ${fileName} - Part ${i + 1}`,
            content: ensureProperFormatting(
              n?.content || "",
              fileName,
              content
            ),
            category: n?.category || detectSmartCategory(content, fileName),
            tags: Array.isArray(n?.tags)
              ? n.tags.slice(0, 5)
              : extractSmartTags(content, fileName),
          }));
        }
      } catch (parseError) {
        console.warn("JSON parsing failed, trying fallback extraction");
      }
    }

    // Fallback: Extract content and create structured note
    const contentMatch = clean.match(/"content":\s*"([^"]+)"/);
    if (contentMatch) {
      const extractedContent = contentMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      return [
        {
          title: `Comprehensive Notes from ${fileName}`,
          content: ensureProperFormatting(extractedContent, fileName, content),
          category: detectSmartCategory(content, fileName),
          tags: extractSmartTags(content, fileName),
        },
      ];
    }

    // If all else fails, use enhanced fallback
    return createEnhancedFallbackNotes(content, fileName);
  } catch (e) {
    console.warn("Error in generateSingleNoteFromContent:", e);
    return createEnhancedFallbackNotes(content, fileName);
  }
}

// ----------------- Public API -----------------
export async function generateNotesFromContent(
  content: string,
  fileName: string
): Promise<any[]> {
  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are an expert academic note-taking specialist. Your task is to create comprehensive, well-structured study notes that cover every topic and subtopic in the exact order they appear in the source material.

CRITICAL REQUIREMENTS:

1. **Complete Coverage**: Include every topic, subtopic, definition, concept, and detail from the source without skipping anything.

2. **Perfect Structure**: 
   - Use the EXACT headings and numbering from the source
   - Maintain the original hierarchy (Unit X, Section Y, etc.)
   - Follow the exact order of topics as they appear

3. **Content Elements** - For each topic include:
   - **Clear definitions** for all terms and concepts
   - **Working principles** and explanations
   - **Key features** and characteristics
   - **Advantages** and **Disadvantages** 
   - **Applications** and examples
   - **Comparisons** and differences when mentioned

4. **Formatting Standards**:
   - Use proper markdown hierarchy (# ## ### #### for headings)
   - **Bold** all important terms, algorithm names, and key concepts
   - Use bullet points for lists and features
   - Include tables when comparing multiple items
   - Add clear spacing between sections

5. **Academic Quality**:
   - Use precise technical terminology from the source
   - Keep explanations clear but comprehensive
   - Maintain academic tone and structure
   - Ensure notes can serve as complete study material

RETURN FORMAT: Valid JSON array with this structure:
[
  {
    "title": "Complete Study Notes: [Exact Topic from Source]",
    "content": "[Full structured markdown content following above requirements]",
    "category": "[Subject area]",
    "tags": ["comprehensive", "structured", "academic", "study-notes"]
  }
]

EXAMPLE STRUCTURE:
# Unit X – [Topic Name]

## 1. [First Major Topic]

**[Term]**: [Complete definition]

**Working Principle**: [Detailed explanation]

**Key Features**:
- Feature 1 with explanation
- Feature 2 with explanation

**Advantages**:
- Advantage 1
- Advantage 2

**Disadvantages**:
- Disadvantage 1
- Disadvantage 2

**Applications**: [List with examples]

## 2. [Second Major Topic]
[Continue same pattern for all topics]

Remember: Extract EVERYTHING from the source in the exact order and structure!`,
      },
      {
        role: "user",
        content: `Create comprehensive, perfectly structured study notes from this content. Follow the exact structure and include every detail:

Source Document: "${fileName}"

CONTENT TO PROCESS:
${content}

IMPORTANT: 
- Use the EXACT headings and numbering from the source
- Include ALL definitions, advantages, disadvantages, applications
- Maintain the original structure and order
- Make it comprehensive enough to replace the original document`,
      },
    ];

    const response = await callOpenRouter(messages, {
      retries: 3,
      model: pickModel("notes", content),
    });

    // Enhanced JSON parsing to handle complex content
    let clean = (response || "").trim();

    // Remove code block markers if present
    clean = clean.replace(/```json\n?|\n?```/g, "");

    let notes: any = null;

    try {
      // Try parsing the full response
      notes = JSON.parse(clean);
    } catch {
      try {
        // Try extracting JSON array
        const arrayMatch = clean.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          notes = JSON.parse(arrayMatch[0]);
        }
      } catch {
        try {
          // Try extracting content from quotes
          const contentMatch = clean.match(/"content":\s*"([\s\S]*?)"/);
          if (contentMatch) {
            const extractedContent = contentMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, "\\");

            notes = [
              {
                title: `Study Notes: ${fileName}`,
                content: extractedContent,
                category: "Academic",
                tags: ["structured", "comprehensive"],
              },
            ];
          }
        } catch {
          // Last resort - create structured notes from content
          notes = null;
        }
      }
    }

    // If parsing failed, create high-quality structured notes
    if (!Array.isArray(notes) || notes.length === 0) {
      return createStructuredFallbackNotes(content, fileName);
    }

    // Ensure returned notes follow the exact requested academic structure
    return notes.map((n: any, i: number) => {
      const raw = n?.content || "";
      const formatted = formatNotesExactStructure(raw || content, fileName);
      return {
        title: n?.title || `Study Notes: ${fileName} - Part ${i + 1}`,
        content: formatted,
        category: n?.category || detectSmartCategory(content, fileName),
        tags: Array.isArray(n?.tags)
          ? n.tags.slice(0, 5)
          : ["structured", "academic", "comprehensive"],
      };
    });
  } catch (e) {
    console.error("Error in generateNotesFromContent:", e);
    return createStructuredFallbackNotes(content, fileName);
  }
}

// Create structured fallback notes when AI parsing fails
function createStructuredFallbackNotes(
  content: string,
  fileName: string
): any[] {
  const clean = content.trim();
  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

  // Extract structure from content
  const lines = clean.split("\n").filter((line) => line.trim());
  let structuredContent = "";

  // Try to detect and preserve original structure
  const hasUnits = content.includes("Unit ") || content.includes("Chapter ");
  const hasNumberedSections = /\d+\.\s+[A-Z]/.test(content);

  if (hasUnits || hasNumberedSections) {
    // Preserve academic structure
    structuredContent = preserveAcademicStructure(content);
  } else {
    // Create structured format
    structuredContent = createBasicStructure(content, title);
  }

  return [
    {
      title: `Study Notes: ${title}`,
      content: formatNotesExactStructure(structuredContent, fileName),
      category: detectSmartCategory(content, fileName),
      tags: ["structured", "comprehensive", "academic", "study-notes"],
    },
  ];
}

// Format any input text into the exact note structure requested by the user.
function formatNotesExactStructure(text: string, fileName: string): string {
  const clean = sanitize(text || "");
  const topics = extractAllTopics(clean);

  // If no detected topics, create a single Unit with the file name
  const effectiveTopics =
    topics.length > 0 ? topics : [fileName.replace(/\.[^/.]+$/, "")];

  const definitions = extractDefinitionsFromPDF(clean);
  const advDis = extractAdvantagesDisadvantages(clean);
  const apps = extractApplicationsFromPDF(clean);

  let out = "";

  effectiveTopics.forEach((topic, idx) => {
    const unitNum = idx + 1;
    out += `# Unit ${unitNum} – ${topic}\n\n`;

    // For each major topic produce a numbered major topic (we'll use the topic itself as first major topic)
    out += `## 1. ${topic}\n\n`;

    // Definitions: try to find definitions matching this topic
    const defsForTopic = definitions.filter((d) =>
      d.term.toLowerCase().includes(topic.split(" ")[0].toLowerCase())
    );
    if (defsForTopic.length === 0 && definitions.length > 0)
      defsForTopic.push(definitions[0]);

    if (defsForTopic.length > 0) {
      defsForTopic.slice(0, 3).forEach((d) => {
        out += `**${d.term}**: ${d.definition}\n\n`;
      });
    } else {
      // Fallback: capture first sentence(s) mentioning topic
      const sentMatch = clean.match(
        new RegExp(`([^.\n]*${escapeRegExp(topic)}[^.\n]*[.\n])`, "i")
      );
      out += `**${topic}**: ${
        sentMatch ? sentMatch[0].trim() : "Definition not available in source."
      }\n\n`;
    }

    // Working Principle: extract sentences mentioning 'principle' or nearby sentences
    const wpMatch = clean.match(
      new RegExp(`([^.\n]{20,200}principle[^.\n]{0,200}[.\n])`, "i")
    );
    if (wpMatch) {
      out += `**Working Principle**: ${wpMatch[0].trim()}\n\n`;
    } else {
      const near = clean.match(
        new RegExp(
          `([^.\n]{40,200}${escapeRegExp(topic)}[^.\n]{0,200}[.\n])`,
          "i"
        )
      );
      out += `**Working Principle**: ${
        near ? near[0].trim() : "Not explicitly described in the source."
      }\n\n`;
    }

    // Key Features
    out += `**Key Features**:\n`;
    // Attempt to extract bullets from formatted sections
    const features = (clean.match(
      /(?:Key Features|Features)[:\n][\s\S]*?(?:\n\n|\n#{1,2}|$)/i
    ) || [""])[0];
    const bullets = features.match(/[-*•]\s*(.+)/g) || [];
    if (bullets.length > 0) {
      bullets
        .slice(0, 6)
        .forEach((b) => (out += `- ${b.replace(/^[-*•]\s*/, "")}\n`));
    } else {
      // Fallback: take a couple of short sentences related to topic
      const sents = extractSentencesAboutTopic(clean, topic).slice(0, 3);
      if (sents.length > 0) sents.forEach((s) => (out += `- ${s}\n`));
      else out += `- Not available in source.\n`;
    }
    out += `\n`;

    // Advantages / Disadvantages
    const ad = advDis[idx] ||
      advDis[0] || { advantages: [], disadvantages: [] };
    out += `**Advantages**:\n`;
    if (ad.advantages && ad.advantages.length > 0)
      ad.advantages.slice(0, 6).forEach((a) => (out += `- ${a}\n`));
    else out += `- Not available in source.\n`;
    out += `\n`;

    out += `**Disadvantages**:\n`;
    if (ad.disadvantages && ad.disadvantages.length > 0)
      ad.disadvantages.slice(0, 6).forEach((d) => (out += `- ${d}\n`));
    else out += `- Not available in source.\n`;
    out += `\n`;

    // Applications
    const appsForTopic = apps.filter((a) =>
      a.application.toLowerCase().includes(topic.split(" ")[0].toLowerCase())
    );
    const chosenApps =
      appsForTopic.length > 0 ? appsForTopic : apps.slice(0, 3);
    out += `**Applications**: `;
    if (chosenApps.length > 0)
      out += chosenApps.map((a) => a.application).join(", ") + "\n\n";
    else out += `Not available in source.\n\n`;
  });

  return out.trim();
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSentencesAboutTopic(text: string, topic: string): string[] {
  const sents = text.split(/(?<=[.!?])\s+/);
  return sents
    .filter((s) => s.toLowerCase().includes(topic.toLowerCase()))
    .map((s) => s.trim());
}

// Preserve academic structure from source
function preserveAcademicStructure(content: string): string {
  let formatted = content;

  // Convert Unit/Chapter headings to markdown
  formatted = formatted.replace(/^(Unit \d+|Chapter \d+)[^\n]*$/gm, "# $&");

  // Convert numbered sections to headings
  formatted = formatted.replace(/^(\d+\.\s+[A-Z][^:\n]*?)$/gm, "## $1");
  formatted = formatted.replace(/^(\d+\.\d+\s+[A-Z][^:\n]*?)$/gm, "### $1");

  // Bold important terms and concepts
  formatted = formatted.replace(/^([A-Z][A-Za-z\s]+):/gm, "**$1**:");
  formatted = formatted.replace(
    /\b(PoW|PoS|DPoS|PoB|PoAc|PoA|PoET|BFT|PBFT|DBFT|ECDSA|SHA-256|Bitcoin|Ethereum)\b/g,
    "**$1**"
  );

  // Format advantages/disadvantages
  formatted = formatted.replace(
    /^(Advantages?|Disadvantages?|Applications?|Features?|Examples?):/gm,
    "\n**$1**:"
  );

  // Format lists
  formatted = formatted.replace(/^([^.\n]+)\.$(?=\n)/gm, "- $1");

  // Clean up spacing
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  return formatted.trim();
}

// Create basic structure when no clear academic format is detected
function createBasicStructure(content: string, title: string): string {
  const paragraphs = content.split("\n\n").filter((p) => p.trim().length > 20);

  let structured = `# Study Notes: ${title}\n\n`;

  paragraphs.forEach((paragraph, index) => {
    const trimmed = paragraph.trim();

    // Try to extract a heading from first sentence
    const firstSentence = trimmed.split(".")[0];
    if (firstSentence.length < 100 && firstSentence.length > 10) {
      structured += `## ${firstSentence}\n\n`;
      const remaining = trimmed.substring(firstSentence.length + 1).trim();
      if (remaining) {
        structured += formatParagraphContent(remaining) + "\n\n";
      }
    } else {
      structured += `## Section ${index + 1}\n\n`;
      structured += formatParagraphContent(trimmed) + "\n\n";
    }
  });

  return structured;
}

// Format paragraph content with proper academic styling
function formatParagraphContent(content: string): string {
  let formatted = content;

  // Bold technical terms and important concepts
  formatted = formatted.replace(
    /\b(algorithm|consensus|blockchain|cryptographic|digital signature|hash function|mining|validation|decentralized|distributed|Byzantine|fault tolerance)\b/gi,
    "**$1**"
  );

  // Format definitions (word: definition pattern)
  formatted = formatted.replace(/^([A-Z][A-Za-z\s]+):\s*(.+)$/gm, "**$1**: $2");

  // Create bullet points from sentence lists
  if (formatted.includes(".") && formatted.split(".").length > 3) {
    const sentences = formatted.split(".").filter((s) => s.trim().length > 10);
    if (sentences.length > 2 && sentences.every((s) => s.length < 200)) {
      formatted = sentences.map((s) => `- ${s.trim()}`).join("\n");
    }
  }

  return formatted;
}

// Ensure proper academic formatting for AI-generated content
function ensureProperAcademicFormatting(
  content: string,
  sourceContent: string,
  fileName: string
): string {
  if (!content || content.trim().length === 0) {
    return preserveAcademicStructure(sourceContent);
  }

  let formatted = content.trim();

  // Ensure proper heading hierarchy
  formatted = formatted.replace(/^#{4,}/gm, "###"); // Max 3 levels

  // Ensure proper spacing around headings
  formatted = formatted.replace(/(#{1,3}\s*[^\n]+)\n([^#\n])/g, "$1\n\n$2");

  // Ensure important terms are bolded
  formatted = formatted.replace(
    /\b(PoW|PoS|DPoS|PoB|PoAc|PoA|PoET|BFT|PBFT|DBFT|ECDSA|SHA-256|Bitcoin|Ethereum|consensus|algorithm|blockchain)\b/g,
    "**$1**"
  );

  // Clean up excessive spacing
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  return formatted;
}

export async function analyzeFileContent(
  content: string,
  fileName: string
): Promise<any> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Analyze file content and return ONLY a valid JSON object with this structure: {\n  \"hasScheduleData\": boolean,\n  \"hasEducationalContent\": boolean,\n  \"hasGeneralNotes\": boolean,\n  \"contentType\": \"schedule\" | \"educational\" | \"notes\" | \"mixed\",\n  \"scheduleItems\": number,\n  \"educationalConcepts\": number,\n  \"confidence\": number,\n  \"suggestedActions\": [\"schedule\", \"flashcards\", \"notes\", \"fun-learning\"],\n  \"summary\": \"brief description\",\n  \"detectedDates\": [\"date1\", \"date2\"],\n  \"keyTopics\": [\"topic1\", \"topic2\"],\n  \"priority\": \"high\" | \"medium\" | \"low\"\n}`,
    },
    {
      role: "user",
      content: `Analyze this file content from \"${fileName}\": ${content.substring(
        0,
        2000
      )}`,
    },
  ];
  try {
    const response = await callOpenRouter(messages, {
      retries: 2,
      model: pickModel("schedule", content),
    });
    const clean = (response || "").trim().replace(/```json\n?|\n?```/g, "");
    return JSON.parse(clean);
  } catch {
    const isSchedule =
      fileName.toLowerCase().includes("schedule") ||
      content.toLowerCase().includes("exam");
    return {
      hasScheduleData: isSchedule,
      hasEducationalContent: !isSchedule,
      hasGeneralNotes: true,
      contentType: isSchedule ? "schedule" : "notes",
      scheduleItems: isSchedule ? 5 : 0,
      educationalConcepts: isSchedule ? 0 : 3,
      confidence: 0.7,
      suggestedActions: isSchedule
        ? ["schedule", "notes"]
        : ["notes", "flashcards"],
      summary: `Content from ${fileName}`,
      detectedDates: [],
      keyTopics: [fileName.split(".")[0]],
      priority: isSchedule ? "high" : "medium",
    };
  }
}

export async function generateScheduleFromContent(
  content: string
): Promise<any[]> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        'Extract schedule items from content and return ONLY a JSON array. Each item: id (uuid), title, date (YYYY-MM-DD), time, type ("exam"|"assignment"|"study"|"reminder"), priority ("high"|"medium"|"low"), description.',
    },
    {
      role: "user",
      content: `Extract schedule items from: ${content.substring(0, 1500)}`,
    },
  ];
  try {
    const response = await callOpenRouter(messages, {
      retries: 2,
      model: pickModel("timetable", content),
    });
    const clean = (response || "").trim().replace(/```json\n?|\n?```/g, "");
    const parsed = JSON.parse(clean);
    const items = Array.isArray(parsed) ? parsed : [];
    return items.map((item) => ({
      id: item.id || crypto.randomUUID(),
      title: item.title || "Scheduled Event",
      date:
        item.date ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      time: item.time || "09:00",
      type: item.type || "exam",
      priority: item.priority || "high",
      description: item.description || "Important scheduled event",
    }));
  } catch {
    return [];
  }
}

/**
 * A highly robust function to extract timetable data using an advanced AI prompt.
 * It preprocesses the text to remove noise and uses a "few-shot" prompt to guide the AI.
 * @param content The raw text content from the timetable file.
 * @param source The source file name for debugging
 * @returns A promise that resolves to an array of timetable classes.
 */
export async function generateTimetableFromContent(
  content: string,
  source: string = "PDF Upload"
): Promise<any[]> {
  console.log("🗓️ [TIMETABLE] Extracting timetable with expert-level parsing...");

  // 1. Aggressive Pre-processing to clean the input data
  const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  const cleanedContent = content
    .split('\n')
    // Remove irrelevant lines and headers/footers
    .filter(line => {
      const upperLine = line.toUpperCase();
      const isDay = DAYS.some(day => upperLine.includes(day));
      const hasTime = /\d{1,2}:\d{2}/.test(line);
      const isSubjectLine = /[A-Z]{2,}/.test(line); // Heuristic for subject codes
      return (isDay || hasTime || isSubjectLine) && !upperLine.includes("FACULTY") && !upperLine.includes("DEPARTMENT");
    })
    .map(line => line.replace(/\s+/g, ' ').trim()) // Normalize spacing
    .join('\n');

  const systemPrompt = `
You are an expert timetable parser. Your task is to analyze the user-provided text, which is often messy and poorly formatted, and extract all class schedules into a clean, structured JSON array.

**CRITICAL INSTRUCTIONS:**
1. **IGNORE ALL GARBAGE**: Discard any text that is not part of the main weekly schedule grid (e.g., headers, footers, subject lists, faculty names).
2. **OUTPUT ONLY JSON**: Your entire response must be a single JSON array \`[]\`. Do not include any other text, explanations, or markdown.
3. **ADHERE TO THE SCHEMA**: Each object in the array must follow this exact structure: \`{ "day": "Monday", "start_time": "HH:MM", "end_time": "HH:MM", "subject": "Subject Name", "faculty": "Faculty Initials", "room": "Room Code" }\`.
4. **HANDLE RECURRENCE**: Assume all classes are weekly recurring events.

**EXAMPLE:**

**messy input:**
"TIME MONDAY TUESDAY
07:30 to 09:00 UI/UX PS MA213-A BT SKS MB203
DEV - WS - MA210
LIBRARY"

**desired JSON output:**
[
  {
    "day": "Monday",
    "start_time": "07:30",
    "end_time": "09:00",
    "subject": "UI/UX",
    "faculty": "PS",
    "room": "MA213-A"
  },
  {
    "day": "Monday",
    "start_time": "07:30",
    "end_time": "09:00",
    "subject": "DEV",
    "faculty": "WS",
    "room": "MA210"
  },
  {
    "day": "Tuesday",
    "start_time": "07:30",
    "end_time": "09:00",
    "subject": "BT",
    "faculty": "SKS",
    "room": "MB203"
  },
  {
    "day": "Tuesday",
    "start_time": "07:30",
    "end_time": "09:00",
    "subject": "LIBRARY",
    "faculty": "N/A",
    "room": "N/A"
  }
]
`;

  try {
    const response = await callOpenRouter([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here is the timetable text:\n\n${cleanedContent}` }
    ], {
      retries: 2,
      model: pickModel("timetable", content),
    });

    console.log("🗓️ [TIMETABLE] AI Response:", response);

    // Extract the JSON array from the response string
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("🚨 [TIMETABLE] AI response did not contain a valid JSON array.");
      return [];
    }

    const rawClasses = JSON.parse(jsonMatch[0]);
    console.log("🗓️ [TIMETABLE] Extracted raw classes:", rawClasses);

    // Convert to our internal format
    const items = rawClasses.map((cls: any, index: number) => ({
      id: `timetable-${Date.now()}-${index}`,
      title: cls.subject || cls.title || "Class",
      day: cls.day || "Monday",
      time: cls.start_time || cls.time || "09:00",
      endTime: cls.end_time || cls.endTime,
      room: cls.room || "",
      instructor: cls.faculty || cls.instructor || "",
      type: "class" as const,
      source: source,
      createdAt: new Date().toISOString(),
      recurring: true,
    }));

    const timetableClasses = items.map((item) => ({
      id: item.id || crypto.randomUUID(),
      title: item.title || "Class",
      day: item.day || "Monday",
      time: item.time || "09:00",
      endTime: item.endTime,
      room: item.room,
      instructor: item.instructor,
      type: item.type || "class",
      source: source,
      createdAt: new Date().toISOString(),
      recurring: true,
    }));

    // If AI returned no items or empty, try manual enhanced fallback
    if (!timetableClasses.length) {
      console.warn(
        "[TIMETABLE] AI returned 0 classes; running manual fallback parser..."
      );
      const fallbackClasses = extractTimetableManually(content, source);
      if (fallbackClasses.length) {
        console.log(
          "🗓️ [TIMETABLE] Enhanced fallback extraction:",
          fallbackClasses
        );
        generateTimetableSummary(fallbackClasses);
        return fallbackClasses;
      }
    }

    console.log("🗓️ [TIMETABLE] Extracted classes:", timetableClasses);

    // Generate formatted summary for user
    generateTimetableSummary(timetableClasses);

    return timetableClasses;
  } catch (error) {
    console.error("🗓️ [TIMETABLE] Extraction failed:", error);

    // Enhanced fallback: Manual pattern detection
    const fallbackClasses = extractTimetableManually(content, source);
    console.log(
      "🗓️ [TIMETABLE] Enhanced fallback extraction:",
      fallbackClasses
    );

    if (fallbackClasses.length > 0) {
      generateTimetableSummary(fallbackClasses);
    }

    return fallbackClasses;
  }
}

// Generate Google Calendar style summary
function generateTimetableSummary(classes: any[]) {
  console.log("\n📅 ===== TIMETABLE EXTRACTION SUMMARY =====");
  console.log("📊 Google Calendar Day-View Style Organization:\n");

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Day-wise detailed view
  days.forEach((day) => {
    const dayClasses = classes.filter((cls) => cls.day === day);
    if (dayClasses.length > 0) {
      console.log(`📅 ${day.toUpperCase()}`);
      console.log("─".repeat(50));

      // Sort by time
      dayClasses.sort((a, b) => a.time.localeCompare(b.time));

      dayClasses.forEach((cls) => {
        const timeRange = cls.endTime
          ? `${cls.time} - ${cls.endTime}`
          : cls.time;
        const location = cls.room ? ` • ${cls.room}` : "";
        const instructor = cls.instructor ? ` • ${cls.instructor}` : "";
        console.log(
          `  ⏰ ${timeRange} | 📚 ${cls.title}${location}${instructor}`
        );
      });
      console.log("");
    }
  });

  // Month-view style summary
  console.log("📊 MONTH-VIEW STYLE SUMMARY:");
  console.log("─".repeat(60));

  days.forEach((day) => {
    const dayClasses = classes.filter((cls) => cls.day === day);
    if (dayClasses.length > 0) {
      const subjects = dayClasses.map((cls) => cls.title).join(", ");
      console.log(`${day}: ${subjects} (${dayClasses.length} classes)`);
    } else {
      console.log(`${day}: No classes`);
    }
  });

  console.log(`\n✅ Total Classes Extracted: ${classes.length}`);
  console.log("🔄 All classes set to recurring (weekly)");
  console.log("=============================================\n");
}

// Enhanced fallback manual timetable extraction
function extractTimetableManually(content: string, source: string): any[] {
  const classes = [];
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const dayAbbr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const lines = content.split("\n");
  let currentDay = "";

  console.log("🔍 [MANUAL] Starting enhanced manual extraction...");

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    // Enhanced day detection patterns
    const dayMatch = days.find(
      (day) =>
        cleanLine.toLowerCase().includes(day.toLowerCase()) ||
        cleanLine.toLowerCase().includes(day.substring(0, 3).toLowerCase())
    );

    if (
      dayMatch &&
      (cleanLine.includes(":") ||
        cleanLine.includes("Schedule") ||
        cleanLine.includes("Day"))
    ) {
      currentDay = dayMatch;
      console.log(`📅 [MANUAL] Found day: ${currentDay}`);
      continue;
    }

    // Enhanced time and content extraction patterns
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/g, // Range: 09:00-10:30
      /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/g, // Single time: 09:00 AM
      /(\d{1,2})\s*:\s*(\d{2})/g, // Basic time: 9:00
    ];

    // Check for any time pattern
    let timeMatch = null;
    let timePattern = "";

    for (const pattern of timePatterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        timeMatch = match;
        timePattern = match[0];
        break;
      }
    }

    if (timeMatch && currentDay) {
      console.log(
        `⏰ [MANUAL] Found time pattern: ${timePattern} on ${currentDay}`
      );

      // Extract time range or single time
      let startTime = "";
      let endTime = "";

      if (
        timePattern.includes("-") ||
        timePattern.includes("–") ||
        timePattern.includes("—")
      ) {
        // Time range
        const rangeParts = timePattern.split(/[-–—]/);
        startTime = normalizeTime(rangeParts[0].trim());
        endTime = normalizeTime(rangeParts[1].trim());
      } else {
        // Single time
        startTime = normalizeTime(timePattern);
      }

      // Extract subject/class info
      let title = cleanLine
        .replace(timePattern, "")
        .replace(/[-–—]/g, "")
        .trim();

      // Extract room information
      let room = "";
      const roomPatterns = [
        /(MA\d+|MB\d+|MC\d+|Lab\s*[A-Z]|Room\s*\d+|Hall\s*[A-Z])/i,
        /\b([A-Z]{2}\d{3})\b/g, // MA201, MC316 etc
        /(room|hall|lab|classroom)\s*([a-z0-9]+)/i,
      ];

      for (const pattern of roomPatterns) {
        const roomMatch = title.match(pattern);
        if (roomMatch) {
          room = roomMatch[0].trim();
          title = title.replace(roomMatch[0], "").trim();
          break;
        }
      }

      // Extract instructor information
      let instructor = "";
      const instructorPatterns = [
        /(prof|dr|professor)\.?\s*([a-z]+)/i,
        /–\s*([A-Z]{2,3})\s*–/g, // – PS –, – SKS –
        /\b([A-Z]{2,4})\b(?=\s*–|\s*$)/g, // PS, SKS, etc
      ];

      for (const pattern of instructorPatterns) {
        const instMatch = title.match(pattern);
        if (instMatch) {
          instructor = instMatch[0].trim();
          title = title.replace(instMatch[0], "").trim();
          break;
        }
      }

      // Clean up title
      title = title
        .replace(/[–—]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^\s*[–—]\s*|\s*[–—]\s*$/g, "")
        .trim();

      // Determine class type
      let type = "class";
      if (title.toLowerCase().includes("lab")) type = "lab";
      else if (title.toLowerCase().includes("lecture")) type = "lecture";
      else if (title.toLowerCase().includes("tutorial")) type = "tutorial";
      else if (title.toLowerCase().includes("seminar")) type = "seminar";

      if (title.length > 0) {
        const classEntry = {
          id: crypto.randomUUID(),
          title: title,
          day: currentDay,
          time: startTime,
          endTime: endTime || undefined,
          room: room || undefined,
          instructor: instructor || undefined,
          type: type,
          source: source,
          createdAt: new Date().toISOString(),
          recurring: true,
        };

        classes.push(classEntry);
        console.log(`✅ [MANUAL] Extracted class:`, classEntry);
      }
    }
  }

  console.log(`📊 [MANUAL] Total extracted: ${classes.length} classes`);
  return classes;
}

// Normalize time to 24-hour format
function normalizeTime(timeStr: string): string {
  timeStr = timeStr.trim();

  // Handle AM/PM
  if (timeStr.toLowerCase().includes("pm") && !timeStr.startsWith("12")) {
    const hour = parseInt(timeStr.split(":")[0]) + 12;
    const minute = timeStr.split(":")[1]?.replace(/[^\d]/g, "") || "00";
    return `${hour.toString().padStart(2, "0")}:${minute.padStart(2, "0")}`;
  } else if (timeStr.toLowerCase().includes("am") && timeStr.startsWith("12")) {
    const minute = timeStr.split(":")[1]?.replace(/[^\d]/g, "") || "00";
    return `00:${minute.padStart(2, "0")}`;
  } else {
    // Remove non-digit/colon characters and ensure proper format
    const cleaned = timeStr.replace(/[^\d:]/g, "");
    const parts = cleaned.split(":");
    if (parts.length >= 2) {
      const hour = parts[0].padStart(2, "0");
      const minute = parts[1].padStart(2, "0");
      return `${hour}:${minute}`;
    }
  }

  return timeStr.replace(/[^\d:]/g, "") || "09:00";
}

export async function generateFlashcards(content: string): Promise<any[]> {
  console.log("[DEBUG] Flashcard Generation - Content Preview:", content.substring(0, 500));

  // A simpler, more direct prompt
  const systemPrompt = `
You are an expert at creating study materials. Based on the provided text, generate a concise set of flashcards. Each flashcard should be a simple question-and-answer pair.

**CRITICAL INSTRUCTIONS:**
1. **Output ONLY a valid JSON array** of objects in your response. Do not include any other text or markdown.
2. The structure must be: \`[{"question": "question text", "answer": "answer text", "category": "category"}]\`.
3. If the text is not suitable for creating flashcards (e.g., it's just a timetable), return an empty array \`[]\`.
4. Create between 3-8 flashcards maximum to avoid overwhelming the learner.
5. Focus on key concepts, definitions, and important facts.
`;

  try {
    const response = await callOpenRouter([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Create flashcards from this text:\n\n${content}` }
    ], {
      retries: 2,
      model: pickModel("flashcards", content),
    });

    console.log("[DEBUG] AI Response:", response);

    // Robust parsing to find the JSON array
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[DEBUG] AI response for flashcards was not a valid array. Returning empty.");
      return [];
    }

    const flashcards = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(flashcards)) {
      console.warn("[DEBUG] Parsed flashcard data is not an array. Returning empty.");
      return [];
    }

    // Normalize the flashcard format
    const normalizedCards = flashcards.map((card: any) => ({
      question: card.question || card.front || card.q || "Question",
      answer: card.answer || card.back || card.a || "Answer",
      category: card.category || "General",
      difficulty: card.difficulty || "medium",
    }));

    console.log("[DEBUG] Generated flashcards:", normalizedCards);
    return normalizedCards;

  } catch (error) {
    console.error("Flashcard generation error:", error);
    return []; // Return empty array on failure
  }
}

export async function generateFunLearning(
  content: string,
  type: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a creative learning assistant. Convert educational content into a ${type} format to make learning fun and engaging. Focus on educational value while making it interactive and enjoyable.`,
    },
    {
      role: "user",
      content: `Create a ${type} from this educational content: ${content}`,
    },
  ];
  return await callOpenRouter(messages, {
    retries: 2,
    model: pickModel("fun", content),
  });
}

export async function extractTextFromImage(imageFile: File): Promise<string> {
  return `[Image content from ${imageFile.name}] - OCR processing would extract text here.`;
}

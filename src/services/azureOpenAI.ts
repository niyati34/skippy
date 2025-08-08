// Azure OpenAI client with proxy-first calls and high-quality note generation
// Env vars (Vite): VITE_OPENAI_API_BASE, VITE_AZURE_OPENAI_KEY, VITE_AZURE_OPENAI_DEPLOYMENT, VITE_AZURE_OPENAI_API_VERSION

const API_ENDPOINT =
  (import.meta as any)?.env?.VITE_OPENAI_API_BASE ||
  (import.meta as any)?.env?.OPENAI_API_BASE ||
  "";
const API_KEY =
  (import.meta as any)?.env?.VITE_AZURE_OPENAI_KEY ||
  (import.meta as any)?.env?.AZURE_OPENAI_API_KEY ||
  "";
const API_VERSION =
  (import.meta as any)?.env?.VITE_AZURE_OPENAI_API_VERSION ||
  (import.meta as any)?.env?.AZURE_OPENAI_API_VERSION ||
  "2025-01-01-preview";
const DEPLOYMENT =
  (import.meta as any)?.env?.VITE_AZURE_OPENAI_DEPLOYMENT ||
  (import.meta as any)?.env?.AZURE_OPENAI_DEPLOYMENT_NAME ||
  "gpt-4o";

function getCompletionsUrl() {
  if (!API_ENDPOINT || !DEPLOYMENT) return "";
  const base = API_ENDPOINT.replace(/\/$/, "");
  return `${base}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callAzureOpenAI(
  messages: ChatMessage[],
  retries = 2 // Reduced for faster response
): Promise<string> {
  const directUrl = getCompletionsUrl();
  const proxyUrl = `http://localhost:${
    (import.meta as any)?.env?.VITE_PROXY_PORT || 5174
  }/api/azure-openai/chat`;

  const call = async (useProxy: boolean) => {
    if (useProxy) {
      const resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          options: { max_tokens: 3000, temperature: 0.1, top_p: 0.8 }, // Increased tokens, lower temperature for speed
        }),
      });
      if (!resp.ok) throw new Error(`Proxy error: ${resp.status}`);
      const data = await resp.json();
      return (
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.delta?.content ||
        ""
      );
    }

    if (!directUrl || !API_KEY)
      throw new Error("Missing Azure OpenAI configuration");

    const resp = await fetch(directUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
      body: JSON.stringify({
        messages,
        max_tokens: 3000, // Increased for more detailed notes
        temperature: 0.1, // Lower for faster, more focused responses
        top_p: 0.8,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });
    if (!resp.ok) throw new Error(`Azure error: ${resp.status}`);
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content || "";
  };

  for (let i = 0; i < retries; i++) {
    const useProxy = i < 1; // Try proxy first, then direct
    try {
      const out = await call(useProxy);
      if (out) return out;
      throw new Error("Empty response");
    } catch (e) {
      console.warn(`API call attempt ${i + 1} failed:`, e);
      if (i < retries - 1) await delay(200 * (i + 1)); // Reduced delay for faster retries
    }
  }
  return "";
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
    const out = await callAzureOpenAI(messages, 1); // Single attempt
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
      // Doesn't end with period
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
    const response = await callAzureOpenAI(messages, 3);

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

    const response = await callAzureOpenAI(messages, 3);

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

    return notes.map((n: any, i: number) => ({
      title: n?.title || `Study Notes: ${fileName} - Part ${i + 1}`,
      content: ensureProperAcademicFormatting(
        n?.content || "",
        content,
        fileName
      ),
      category: n?.category || detectSmartCategory(content, fileName),
      tags: Array.isArray(n?.tags)
        ? n.tags.slice(0, 5)
        : ["structured", "academic", "comprehensive"],
    }));
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
      content: structuredContent,
      category: detectSmartCategory(content, fileName),
      tags: ["structured", "comprehensive", "academic", "study-notes"],
    },
  ];
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
    const response = await callAzureOpenAI(messages, 2);
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
    const response = await callAzureOpenAI(messages, 2);
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

export async function generateFlashcards(content: string): Promise<any[]> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Create flashcards from educational content. Return a JSON array where each item has: question, answer, difficulty (easy/medium/hard), category, hint (optional), explanation (optional).",
    },
    { role: "user", content: `Create educational flashcards from: ${content}` },
  ];
  try {
    const response = await callAzureOpenAI(messages, 2);
    const clean = (response || "").trim().replace(/```json\n?|\n?```/g, "");
    return JSON.parse(clean);
  } catch {
    return [];
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
  return await callAzureOpenAI(messages, 2);
}

export async function extractTextFromImage(imageFile: File): Promise<string> {
  return `[Image content from ${imageFile.name}] - OCR processing would extract text here.`;
}

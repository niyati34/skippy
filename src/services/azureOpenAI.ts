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
          options: { max_tokens: 2000, temperature: 0.2, top_p: 0.9 },
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
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
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
      if (i < retries - 1) await delay(500 * (i + 1)); // Reduced delay
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

function createEnhancedFallbackNotes(content: string, fileName: string) {
  const clean = sanitize(content);
  if (clean.length < 50) {
    return [
      {
        title: `Notes from ${fileName}`,
        content: `# Document Summary\n\n${clean}\n\n> Add more details to improve study usefulness.`,
        category: "General",
        tags: ["document", "review", "manual"],
      },
    ];
  }
  return [
    {
      title: `Study Notes: ${fileName.replace(/\.[^/.]+$/, "")}`,
      content: createStructuredContent(clean, fileName),
      category: detectSmartCategory(clean, fileName),
      tags: extractSmartTags(clean, fileName),
    },
  ];
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

// ----------------- Public API -----------------
export async function generateNotesFromContent(
  content: string,
  fileName: string
): Promise<any[]> {
  // Quick processing for small files, condense only if really large
  const source = await condenseContentIfLarge(content, fileName);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Create structured study notes from any content. Return a JSON array with objects containing: title, content (markdown format), category, tags.

Requirements:
- Professional, organized notes with clear markdown sections
- Include headings (##), bullet points, and key information
- Extract main concepts, important points, examples
- Format as proper markdown for good readability

Return ONLY the JSON array, no other text.`,
    },
    {
      role: "user",
      content: `Create study notes from "${fileName}":\n\n${source}`,
    },
  ];

  try {
    const response = await callAzureOpenAI(messages, 3);
    const clean = (response || "").trim().replace(/```json\n?|\n?```/g, "");
    let notes: any = null;
    try {
      notes = JSON.parse(clean);
    } catch {
      const match = clean.match(/\[[\s\S]*\]/);
      if (match) notes = JSON.parse(match[0]);
    }
    if (!Array.isArray(notes) || notes.length === 0)
      return createEnhancedFallbackNotes(source, fileName);

    return notes.map((n: any, i: number) => ({
      title: n?.title || `Notes from ${fileName} - Part ${i + 1}`,
      content: ensureStructure(n?.content || "", fileName, source),
      category: n?.category || detectSmartCategory(source, fileName),
      tags: Array.isArray(n?.tags)
        ? n.tags.slice(0, 5)
        : extractSmartTags(source, fileName),
    }));
  } catch (e) {
    return createEnhancedFallbackNotes(source, fileName);
  }
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

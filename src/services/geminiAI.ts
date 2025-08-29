/**
 * Google Gemini AI API Client
 * High-performance fallback for when OpenRouter is rate-limited
 * Free tier: 15 requests per minute, 1500 requests per day
 */

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topK?: number;
    topP?: number;
  };
}

/**
 * Call Gemini API directly
 */
async function callGemini(
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseMimeType?: string;
  } = {}
): Promise<string> {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const model =
    options.model ||
    import.meta.env.VITE_GEMINI_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-1.5-flash";
  const baseUrl =
    import.meta.env.VITE_GEMINI_API_BASE ||
    process.env.GEMINI_API_BASE ||
    "https://generativelanguage.googleapis.com/v1beta";

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error(
      "Gemini API key not configured. Get one from https://aistudio.google.com/app/apikey"
    );
  }

  // Convert OpenAI-style messages to Gemini format
  const contents = messages
    .filter((msg) => msg.role !== "system") // Remove system messages first
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model", // Gemini uses 'model' instead of 'assistant'
      parts: [{ text: msg.content }],
    }));

  // Prepend system message content to the first user message if present
  const systemMessage = messages.find((msg) => msg.role === "system");
  if (systemMessage && contents.length > 0 && contents[0].role === "user") {
    contents[0].parts[0].text = `${systemMessage.content}\n\n${contents[0].parts[0].text}`;
  }

  const requestBody: GeminiRequest = {
    contents,
    generationConfig: {
      temperature: options.temperature || 0.1,
      maxOutputTokens: options.maxTokens || 2048,
      topK: 40,
      topP: 0.95,
      // Hint Gemini to return structured JSON only when requested
      ...(options.responseMimeType
        ? { responseMimeType: options.responseMimeType }
        : {}),
    },
  };

  console.log("🤖 [GEMINI] Calling API with model:", model);

  try {
    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🚨 [GEMINI] API Error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid Gemini API response format");
    }

    const result = data.candidates[0].content.parts[0].text;
    console.log("✅ [GEMINI] Response received, length:", result.length);
    // Log a safe preview of the raw Gemini answer for debugging
    try {
      const preview = result.slice(0, 2000);
      console.log("📝 [GEMINI RAW RESPONSE]\n" + preview);
    } catch {}
    return result;
  } catch (error) {
    console.error("🚨 [GEMINI] Request failed:", error);
    throw error;
  }
}

/**
 * Generate timetable data using Gemini AI
 */
export async function generateTimetableWithGemini(
  content: string,
  source: string = "PDF Upload"
): Promise<any[]> {
  console.log("🗓️ [GEMINI TIMETABLE] Starting extraction with Gemini AI...");

  // Preprocess content for better parsing - preserve table structure
  const headerStripped = (content || "")
    .replace(/FACULTY OF [^\n]+/gi, "")
    .replace(/DEPARTMENT OF [^\n]+/gi, "")
    .replace(/CLASS\s*ROOM[:-]\s*[^\n]+/gi, "")
    .replace(/WITH\s*EFFECT\s*FROM[^\n]*/gi, "")
    .replace(/CLASS COORDINATOR[^\n]*/gi, "")
    .replace(/\bTEA\s*BREAK\b/gi, "")
    .trim();

  // Enhanced boundary detection to preserve table relationships
  const withBoundaries = headerStripped
    .replace(
      /\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b/gi,
      "\n=== DAY: $1 ===\n"
    )
    .replace(
      /(\d{1,2}:\d{2}\s*(?:to|-|–|—|~)\s*\d{1,2}:\d{2})/gi,
      "\n⏰ TIME: $1 ⏰\n"
    )
    .replace(/(UI\/UX|BT|NLP|DEV|AI|CD|DWDM|MP1)/gi, "📚 $1 📚")
    .replace(/(M[ABC]\d{3}(?:-[A-Z])?)/gi, "🏢 $1 🏢")
    .replace(/\b([A-Z]{2,3})\b/g, "👨‍🏫 $1 👨‍🏫")
    .replace(/\s+\n/g, "\n");

  let cleanedContent = withBoundaries
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (!line) return false;
      const upperLine = line.toUpperCase();

      // Keep day markers, time slots, subjects, rooms, faculty, and structural elements
      const isDay =
        /(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY|DAY:)/.test(
          upperLine
        );
      const hasTime = /\d{1,2}:\d{2}|TIME:/.test(line);
      const isSubjectLike =
        /(UI\/?UX|BT|NLP|DEV|AI|CD|DWDM|MP1|LAB|LECTURE)/i.test(line);
      const isRoomLike = /\bM[ABC]\d{3}(?:-[A-Z])?\b/i.test(line);
      const isFacultyCode = /👨‍🏫|[A-Z]{2,3}/.test(line);
      const isStructural = /===|TIME:|📚|🏢|👨‍🏫|⏰|ALL|Sr\.|No\./.test(line);
      const isLongEnough = line.length > 3;

      return (
        isDay ||
        hasTime ||
        isSubjectLike ||
        isRoomLike ||
        isFacultyCode ||
        isStructural ||
        isLongEnough
      );
    })
    .join("\n");

  if (!cleanedContent || cleanedContent.length < 50) {
    console.warn(
      "[GEMINI] Cleaned content too short; applying rescue segmentation"
    );
    const windows: string[] = [];
    const src = content || "";
    const timeRe = /(\d{1,2}:\d{2}\s*(?:to|-|–|—|~)\s*\d{1,2}:\d{2})/gi;
    let m: RegExpExecArray | null;
    while ((m = timeRe.exec(src)) && windows.length < 60) {
      const start = Math.max(0, m.index - 80);
      const end = Math.min(src.length, m.index + m[0].length + 120);
      windows.push(src.slice(start, end).replace(/\s+/g, " ").trim());
    }
    cleanedContent = windows.join("\n");
  }

  console.log("📄 [GEMINI] Content preview:", cleanedContent.substring(0, 300));
  console.log("📊 [GEMINI] Full content length:", cleanedContent.length);
  console.log(
    "📋 [GEMINI] Days found in content:",
    ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].filter((day) =>
      cleanedContent.toUpperCase().includes(day)
    )
  );

  const systemPrompt = `
You are an expert academic timetable parser with high accuracy requirements. Extract timetable from the provided content and return a comprehensive JSON structure.

**ACCURACY REQUIREMENTS:**
- Parse ONLY data that clearly exists in the input text
- Use exact subject codes, faculty initials, and room numbers as written
- Do NOT guess or interpolate missing information
- Maintain precision in time slots and day mappings

**PREFERRED OUTPUT - Rich Object with Metadata:**
{
  "division": "TC4",
  "semester": "VII", 
  "class_coordinator": {
    "name": "Prof. Parth Shah",
    "room": "MA213-C", 
    "contact": "9898570708"
  },
  "class_rooms": ["MA205", "MA206", "MA210"],
  "effective_from": "2025-06-30",
  "days": {
    "Monday": {
      "07:30 - 09:00": { "subject": "UI/UX", "faculty": "PS", "room": "MA213-A" },
      "09:00 - 10:30": { "subject": "BT", "faculty": "SKS", "room": "MA206" },
      "10:30 - 11:00": { "subject": "CD", "faculty": "JS", "room": "MA205" }
    },
    "Tuesday": {
      "07:30 - 09:00": { "subject": "BT", "faculty": "SKS", "room": "MB203" }
    }
  },
  "subjects": {
    "UI/UX": "User Interface/User Experience Design",
    "BT": "Blockchain Technology", 
    "AI": "Artificial Intelligence",
    "CD": "Compiler Design",
    "NLP": "Natural Language Processing",
    "DWDM": "Data Warehousing & Data Mining",
    "MP1": "Major Project - 1"
  },
  "faculty": {
    "PS": "Prof. Parth Shah",
    "SKS": "Dr. Sushil Kumar Singh", 
    "JS": "Prof. Jaydip Siyara",
    "AC": "Dr. Arindam Chaudhuri",
    "PT": "Prof. Pranav Tank",
    "RP": "Dr. Ruchi Patel",
    "WS": "Prof. Wanglen Soram"
  }
}

**ALTERNATIVE - Flat Array (if rich format too complex):**
[
  { "day": "Monday", "start_time": "07:30", "end_time": "09:00", "subject": "UI/UX", "faculty": "PS", "room": "MA213-A", "combined": "UI/UX • PS • MA213-A" },
  { "day": "Monday", "start_time": "09:00", "end_time": "10:30", "subject": "BT", "faculty": "SKS", "room": "MA206", "combined": "BT • SKS • MA206" }
]

**EXTRACTION RULES:**
1. Parse time slots exactly as written (e.g., "07:30 to 09:00", "09:00 to 10:30")
2. Extract subject codes precisely (UI/UX, BT, NLP, DEV, AI, CD, DWDM, MP1)
3. Get faculty initials as shown (PS, SKS, AC, WS, PT, JS, RP)
4. Capture room codes exactly (MA213-A, MB203, MC310, MA205, MA206, MA210)
5. Map days correctly (Monday, Tuesday, Wednesday, Thursday, Friday)
6. Include metadata: division, semester, coordinator info, effective date
7. Expand subject abbreviations to full names when recognizable

**OUTPUT:** JSON only, no explanations or markdown
`;

  const userPrompt = `EXTRACT COMPLETE WEEKLY TIMETABLE - ALL DAYS REQUIRED:

Parse this academic timetable content and extract data for ALL WEEKDAYS (Monday through Friday). Do not skip any days that appear in the content.

**CRITICAL REQUIREMENTS:**
1. Extract data for ALL WEEKDAYS: Monday, Tuesday, Wednesday, Thursday, Friday
2. Look for time patterns across the entire content 
3. Map each time slot to the correct day of the week
4. Include ALL visible subjects, rooms, and faculty for each day
5. Return rich JSON object format with complete weekly schedule

**CONTENT TO PARSE:**
${cleanedContent}

**INSTRUCTIONS:**
- Use rich object format with days grid
- Extract ALL visible time slots and subjects
- Include coordinator info, rooms, effective date
- Map faculty initials to full names where clear
- Expand subject codes to full names
- Be precise with times and room numbers

Return JSON only:`;

  try {
    const response = await callGemini(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: "gemini-1.5-flash",
        temperature: 0.1,
        maxTokens: 4096,
        responseMimeType: "application/json",
      }
    );

    // Robust JSON cleanup: strip code fences and pre/post text, accept object/array
    const cleaned = response
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let rawClasses: any = [];
    let richObject: any = null;
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        rawClasses = parsed;
      } else if (parsed && Array.isArray(parsed.weekly_schedule)) {
        rawClasses = parsed.weekly_schedule;
      } else if (parsed && Array.isArray(parsed.classes)) {
        rawClasses = parsed.classes;
      } else if (parsed && parsed.days && typeof parsed.days === "object") {
        richObject = parsed;
        const dayNames = Object.keys(parsed.days || {});
        for (const day of dayNames) {
          const slots = parsed.days[day] || {};
          for (const slot of Object.keys(slots)) {
            const v = slots[slot] || {};
            const match = slot.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
            rawClasses.push({
              day,
              start_time: match ? match[1] : undefined,
              end_time: match ? match[2] : undefined,
              subject: v.subject || v.title || "",
              faculty: v.faculty || "",
              room: v.room || "",
              combined:
                [v.subject, v.faculty, v.room].filter(Boolean).join(" • ") ||
                undefined,
            });
          }
        }
      } else {
        // last resort: scan for first array
        const m = cleaned.match(/\[[\s\S]*\]/);
        rawClasses = m ? JSON.parse(m[0]) : [];
      }
    } catch (e) {
      const m = cleaned.match(/\[[\s\S]*\]/);
      rawClasses = m ? JSON.parse(m[0]) : [];
    }

    console.log(
      "🗓️ [GEMINI] Extracted classes:",
      Array.isArray(rawClasses) ? rawClasses.length : 0
    );

    if (richObject) {
      console.log("\n📋 [GEMINI RICH JSON] For schedule manager:");
      console.log("==========================================");
      console.log(JSON.stringify(richObject, null, 2));
      console.log("==========================================\n");
    } else {
      // 📋 LOG: Direct JSON format for schedule placement
      console.log("\n📋 [GEMINI SCHEDULE JSON] Ready for direct placement:");
      console.log("==========================================");
      console.log(JSON.stringify(rawClasses, null, 2));
      console.log("==========================================\n");
    }

    // Convert to internal format
    const items = rawClasses.map((cls: any, index: number) => ({
      id: `gemini-timetable-${Date.now()}-${index}`,
      title: cls.subject || cls.title || "Class",
      day: cls.day || "Monday",
      time: cls.start_time || cls.time || "09:00",
      endTime: cls.end_time || cls.endTime,
      room: cls.room || "",
      instructor: cls.faculty || cls.instructor || "",
      type: "class" as const,
      source: `${source} (Gemini)`,
      createdAt: new Date().toISOString(),
    }));

    console.log("✅ [GEMINI] Successfully parsed", items.length, "classes");
    return items;
  } catch (error) {
    console.error("🚨 [GEMINI] Timetable extraction failed:", error);
    return [];
  }
}

/**
 * Generate flashcards using Gemini AI
 */
export async function generateFlashcardsWithGemini(
  content: string,
  source: string = "PDF Upload",
  opts: { count?: number; difficulty?: string; category?: string } = {}
): Promise<any[]> {
  console.log("📚 [GEMINI FLASHCARDS] Starting generation...");

  const desired = Math.max(1, Math.min(100, Number(opts.count || 0) || 0));
  const difficulty = (opts.difficulty || "").toString().toLowerCase();
  const difficultyHint = difficulty
    ? `Aim for ${difficulty} difficulty in phrasing and depth.`
    : "";

  const systemPrompt = `
Create educational flashcards from the provided content. Focus on key concepts, definitions, and important information.

OUTPUT ONLY JSON: Return a JSON array with no other text.
SCHEMA: {"question": "What is...", "answer": "Definition or explanation", "category": "${
    opts.category || "General"
  }"}

${
  desired
    ? `Return exactly ${desired} flashcards. Do not include any extra commentary.`
    : `Generate 6-12 high-quality flashcards that help students learn the material.`
}
${difficultyHint}
`;

  const topic = opts.category || "General";
  const desiredCountText = desired
    ? `Create exactly ${desired} flashcards.`
    : `Create 6-12 flashcards.`;
  const negativeConstraints = `
Rules:
- The topic is strictly: ${topic}.
- Do NOT switch languages or topics. For example, if topic is JavaScript, do not generate Java (JVM) questions.
- If the provided content mentions other topics, ignore them and stay on ${topic}.
- Each item MUST be about ${topic}.
`;

  const userPrompt = `${desiredCountText}
${negativeConstraints}

Content:
${content.substring(0, 2000)}`;

  try {
    const response = await callGemini(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: "gemini-1.5-flash",
        temperature: 0.3,
        maxTokens: 1500,
        responseMimeType: "application/json",
      }
    );

    // Log the raw response from Gemini for flashcard generation
    try {
      console.log("📝 [GEMINI FLASHCARDS RAW]\n" + response.slice(0, 4000));
    } catch {}

    // Robust JSON extraction
    const tryParsers: Array<() => any[]> = [
      // 1) Direct parse
      () => {
        const parsed = JSON.parse(response);
        return Array.isArray(parsed) ? parsed : [];
      },
      // 2) Strip common code fences and parse
      () => {
        const stripped = response.replace(/```json\n?|```/g, "");
        const parsed = JSON.parse(stripped);
        return Array.isArray(parsed) ? parsed : [];
      },
      // 3) Regex match first array
      () => {
        const m = response.match(/\[[\s\S]*\]/);
        return m ? (JSON.parse(m[0]) as any[]) : [];
      },
      // 4) Bracket balance extraction for arrays (ignore brackets inside strings)
      () => {
        const s = response;
        let start = -1;
        let depth = 0;
        let inString = false;
        let prev = "";
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (inString) {
            if (ch === '"' && prev !== "\\") inString = false;
          } else {
            if (ch === '"') inString = true;
            else if (ch === "[") {
              if (start === -1) start = i;
              depth++;
            } else if (ch === "]") {
              depth--;
              if (depth === 0 && start !== -1) {
                const candidate = s.slice(start, i + 1);
                // Clean trailing commas
                const cleaned = candidate.replace(/,(\s*[}\]])/g, "$1");
                try {
                  const parsed = JSON.parse(cleaned);
                  return Array.isArray(parsed) ? parsed : [];
                } catch {}
              }
            }
          }
          prev = ch;
        }
        return [];
      },
      // 5) Loose extraction: build cards from key pairs if JSON parse fails
      () => {
        const items: any[] = [];
        const re =
          /\{[^}]*?"question"\s*:\s*"([\s\S]*?)"[^}]*?"answer"\s*:\s*"([\s\S]*?)"(?:[^}]*?"category"\s*:\s*"([\s\S]*?)")?[^}]*?\}/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(response)) && items.length < (desired || 100)) {
          const q = (m[1] || "").replace(/\n+/g, " ").trim();
          const a = (m[2] || "").replace(/\n+/g, " ").trim();
          const c = (m[3] || opts.category || "General").trim();
          if (q && a) items.push({ question: q, answer: a, category: c });
        }
        return items;
      },
    ];

    let flashcards: any[] = [];
    for (const fn of tryParsers) {
      try {
        flashcards = fn();
        if (Array.isArray(flashcards) && flashcards.length) break;
      } catch {}
    }

    if (!flashcards || !flashcards.length) {
      console.warn("🚨 [GEMINI] No JSON array found in flashcard response");
      return [];
    }
    console.log("✅ [GEMINI] Generated", flashcards.length, "flashcards");

    const normalized = flashcards.map((card: any, index: number) => ({
      id: `gemini-flashcard-${Date.now()}-${index}`,
      ...card,
      source: `${source} (Gemini)`,
      createdAt: new Date().toISOString(),
    }));

    // If Gemini returned fewer than desired, just return what we have;
    // caller may decide to top-up.
    if (desired && normalized.length > desired) {
      return normalized.slice(0, desired);
    }

    return normalized;
  } catch (error) {
    console.error("🚨 [GEMINI] Flashcard generation failed:", error);
    return [];
  }
}

export { callGemini };

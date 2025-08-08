import {
  callAzureOpenAI,
  ChatMessage,
  generateNotesFromContent as generateNotesFromContentAI,
} from "./azureOpenAI";
import { PerformanceTimer } from "../utils/performance";

export interface FileProcessingResult {
  success: boolean;
  content: string;
  flashcards: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  notes: Array<{
    title: string;
    content: string;
    category: string;
    tags: string[];
  }>;
  scheduleItems: Array<{
    title: string;
    time: string;
    date: string;
    type: "assignment" | "study" | "exam" | "note";
  }>;
  summary: string;
  error?: string;
}

// Enhanced file content extraction with PDF and image support
export async function extractFileContent(file: File): Promise<string> {
  const timer = new PerformanceTimer(`File extraction: ${file.name}`);

  try {
    console.log(
      "Processing file:",
      file.name,
      "Type:",
      file.type,
      "Size:",
      file.size
    );

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    timer.checkpoint("File type detection");

    // Handle text-based files
    if (
      mimeType.includes("text/") ||
      ["txt", "md", "csv", "json", "html", "xml", "js", "ts", "css"].includes(
        fileExtension || ""
      )
    ) {
      const content = await file.text();
      if (!content.trim()) {
        throw new Error("File appears to be empty");
      }
      timer.end();
      return content;
    }

    // Handle PDF files
    if (mimeType.includes("pdf") || fileExtension === "pdf") {
      const result = await extractPDFContent(file);
      timer.end();
      return result;
    }

    // Handle image files
    if (
      mimeType.includes("image/") ||
      ["jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff"].includes(
        fileExtension || ""
      )
    ) {
      const result = await extractImageText(file);
      timer.end();
      return result;
    }

    timer.end();
    // Handle unsupported file types
    throw new Error(
      `File type "${
        fileExtension || mimeType
      }" is not supported yet.\n\nSupported formats:\n• Text files (.txt, .md)\n• PDF files (.pdf)\n• Images (.jpg, .png, .gif, etc.)\n• CSV files (.csv)\n• Code files (.js, .ts, .html, .css)\n• JSON files (.json)\n\nPlease use one of these formats and try again! 📁`
    );
  } catch (error) {
    timer.end();
    console.error("Error extracting file content:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      "Unable to process this file. Please ensure it's a valid file and try again."
    );
  }
}

// Extract text content from PDF files using PDF.js (FAST - no OCR)
async function extractPDFContent(file: File): Promise<string> {
  const timer = new PerformanceTimer("PDF processing (fast mode)");
  console.log("Processing PDF file with PDF.js (fast text extraction only)...");

  try {
    // Dynamic import to avoid build issues
    const pdfjsLib = await import("pdfjs-dist");

    // Use CDN worker for reliability
    (
      pdfjsLib as any
    ).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

    timer.checkpoint("PDF.js setup");

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const pdf = await (pdfjsLib as any).getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    }).promise;

    timer.checkpoint(`PDF loaded (${pdf.numPages} pages)`);

    let fullText = "";

    // Extract text from each page (NO OCR - just text)
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Safely process text content items
        let textItems = [];
        if (
          textContent &&
          textContent.items &&
          Array.isArray(textContent.items)
        ) {
          textItems = textContent.items;
        }

        // Combine text items into readable text with better structure preservation
        const pageText = textItems
          .map((item: any) => {
            try {
              if (!item || !item.str || typeof item.str !== "string")
                return null;
              // Check if this item starts a new line/paragraph based on position
              const transform = item.transform;
              const y = transform ? transform[5] : 0;
              return {
                text: item.str,
                y: y,
                x: transform ? transform[4] : 0,
              };
            } catch (itemError) {
              console.warn(
                `Error processing text item on page ${pageNum}:`,
                itemError
              );
              return null;
            }
          })
          .filter(
            (item) =>
              item &&
              item.text &&
              typeof item.text === "string" &&
              item.text.trim()
          )
          .sort((a, b) => b.y - a.y || a.x - b.x) // Sort by position (top-to-bottom, left-to-right)
          .map((item) => item.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (pageText) {
          fullText += `\n\nPage ${pageNum}:\n${pageText}`;
        }

        console.log(
          `Processed page ${pageNum}, extracted ${pageText.length} characters`
        );
      } catch (pageError) {
        console.warn(`Error processing page ${pageNum}:`, pageError);
        continue; // Skip problematic pages
      }
    }

    // Clean up the extracted text while preserving structure
    fullText = fullText
      .replace(/Page \d+:\s*/g, "") // Remove page markers for cleaner flow
      .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
      .replace(/^\s+|\s+$/g, "") // Trim start/end
      .replace(/([.!?])\s+([A-Z])/g, "$1\n\n$2") // Add paragraph breaks after sentences that start new topics
      .replace(/(\d+\.)\s+([A-Z])/g, "\n\n$1 $2") // Add breaks before numbered points
      .replace(/([a-z])([A-Z][a-z])/g, "$1 $2") // Add space between camelCase words
      .replace(/\s+/g, " ") // Normalize spaces
      .replace(/[^\x20-\x7E\s\n]/g, ""); // Remove non-printable chars but keep newlines

    timer.end();

    if (!fullText || fullText.length < 20) {
      console.warn("Limited text extracted from PDF");
      return (
        fullText ||
        "PDF content could not be extracted properly. This appears to be a technical or image-based document."
      );
    }

    console.log(
      `Successfully extracted ${fullText.length} characters from PDF (fast mode)`
    );
    return fullText;
  } catch (error) {
    timer.end();
    console.error("PDF processing error:", error);

    // Provide specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes("No readable text found")) {
        throw new Error(`📄 This PDF doesn't contain readable text.

This might be:
• A scanned document (image-based PDF)
• A PDF with only images
• A corrupted file

Try:
• Using a PDF with selectable text
• Converting scanned PDFs to text first
• Copy-pasting the content directly`);
      }

      if (
        error.message.includes("Invalid PDF structure") ||
        error.message.includes("corrupted")
      ) {
        throw new Error(`📄 PDF file appears to be corrupted or invalid.

Please try:
• Re-downloading the PDF file
• Using a different PDF viewer to save/export the file
• Converting the PDF to text format
• Copy-pasting the content directly`);
      }
    }

    // Generic PDF processing error
    throw new Error(`📄 Unable to process this PDF file.

This could be due to:
• Password-protected PDF
• Corrupted file
• Unsupported PDF format
• Network issues

Try:
• Using a different PDF
• Converting to text format (.txt)
• Copy-pasting the content directly into the chat

I can still create amazing flashcards and notes from any text you provide! 🎯`);
  }
}

// Extract text from images - simplified fallback (no OCR for speed)
async function extractImageText(file: File): Promise<string> {
  // For speed optimization, we skip OCR processing
  // Images need to be converted to text first for fastest processing
  throw new Error(`📷 Image processing temporarily simplified for speed.

For fastest results like ChatGPT:
• Convert images to text using another tool first
• Upload PDF or text documents instead
• Copy-paste text directly into the chat

This ensures instant processing! ⚡`);
}

// Fallback flashcard creation from any readable content
function createFallbackFlashcards(
  content: string,
  source: string
): Array<{
  question: string;
  answer: string;
  category: string;
}> {
  const cards = [];

  // Extract meaningful sentences from content
  const sentences = content
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 200)
    .slice(0, 10);

  if (sentences.length === 0) return [];

  // Create basic reading comprehension flashcards
  sentences.slice(0, 3).forEach((sentence, index) => {
    if (sentence.includes(" ")) {
      const words = sentence.split(" ");
      if (words.length > 5) {
        cards.push({
          question: `What does this statement from ${source} mean: "${sentence.substring(
            0,
            80
          )}..."?`,
          answer: `This statement explains: ${sentence}`,
          category: "Reading Comprehension",
        });
      }
    }
  });

  // Create definition-style cards if possible
  const definitionPattern =
    /(\w+)\s+(?:is|are|means|refers to|defines)\s+(.+)/gi;
  let match;
  while ((match = definitionPattern.exec(content)) && cards.length < 5) {
    const term = match[1];
    const definition = match[2].substring(0, 150);
    cards.push({
      question: `What is ${term}?`,
      answer: `${term} ${definition}`,
      category: "Definitions",
    });
  }

  // Create basic fact cards from numbers or dates
  const factPattern = /(\d{4}|\d+%|\$\d+|[\d,]+)/g;
  const facts = content.match(factPattern);
  if (facts && facts.length > 0 && cards.length < 3) {
    cards.push({
      question: `What numerical information is mentioned in ${source}?`,
      answer: `The document mentions: ${facts.slice(0, 3).join(", ")}`,
      category: "Facts & Figures",
    });
  }

  return cards;
}

// Generate flashcards from content using AI
export async function generateFlashcardsFromContent(
  content: string,
  source: string
): Promise<
  Array<{
    question: string;
    answer: string;
    category: string;
  }>
> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an expert educational content analyzer. Create high-quality study flashcards from ANY content that has educational value.

CRITICAL REQUIREMENTS:
1. IGNORE technical metadata, file structure, formatting codes, or binary data
2. Extract educational concepts from ANY subject matter (math, science, history, literature, business, etc.)
3. Create flashcards from definitions, facts, processes, concepts, formulas, or any learnable information
4. DO NOT reject content - find educational value in any meaningful text

RETURN ONLY A VALID JSON ARRAY with this exact structure:
[
  {
    "question": "Clear, specific question about the content",
    "answer": "Comprehensive answer with explanation", 
    "category": "Subject/Topic"
  }
]

Flashcard Creation Guidelines:
- Create 3-10 flashcards from ANY meaningful content found
- If content seems academic, create detailed study questions
- If content seems professional, create knowledge-based questions
- If content seems informational, create comprehension questions
- Questions should test understanding of key concepts, facts, or processes
- Answers should be educational and substantial (2-4 sentences when appropriate)
- Categories should reflect the actual subject matter (Science, Math, Business, Literature, History, Technology, etc.)
- Focus on facts, concepts, definitions, processes, and important information
- ALWAYS create at least 3 flashcards if ANY educational content exists

FALLBACK STRATEGY:
If content appears corrupted or completely meaningless, create basic reading comprehension flashcards from any coherent text found.

RETURN ONLY THE JSON ARRAY, no other text or explanations.`,
    },
    {
      role: "user",
      content: `Create educational flashcards from this content (source: ${source}). Find educational value in any meaningful information:\n\n${content.substring(
        0,
        4000
      )}`,
    },
  ];

  try {
    // Debug: Log the content being sent to the AI
    console.log(
      "[DEBUG] Flashcard Generation - Content Preview:",
      content.substring(0, 1000)
    );
    console.log("[DEBUG] Content length:", content.length);
    console.log("[DEBUG] Source file:", source);

    const response = await callAzureOpenAI(messages);
    console.log("[DEBUG] AI Response:", response.substring(0, 500));

    const cleanResponse = response.trim().replace(/```json\n?|\n?```/g, "");
    console.log("[DEBUG] Cleaned Response:", cleanResponse.substring(0, 300));

    let flashcards;
    try {
      flashcards = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error("[DEBUG] JSON Parse Error:", parseError);
      // Try to extract JSON from response if it's wrapped in text
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        flashcards = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Validate that we have meaningful flashcards
    if (!Array.isArray(flashcards)) {
      console.error("[DEBUG] Response is not an array:", typeof flashcards);
      throw new Error("AI response is not a valid array");
    }

    if (flashcards.length === 0) {
      console.error("[DEBUG] Empty flashcards array");
      // Create fallback flashcards from content
      const fallbackCards = createFallbackFlashcards(content, source);
      if (fallbackCards.length > 0) {
        console.log("[DEBUG] Using fallback flashcards:", fallbackCards.length);
        return fallbackCards;
      }
      throw new Error(
        "No educational content found suitable for flashcard generation"
      );
    }

    // Filter out any flashcards about technical/file details but be more lenient
    const validFlashcards = flashcards.filter((card) => {
      if (!card.question || !card.answer) return false;

      const lowercaseQuestion = card.question.toLowerCase();
      const strictTechnicalTerms = [
        "pdf structure",
        "file metadata",
        "binary data",
        "encoding format",
        "document properties",
      ];

      // Only filter out very technical questions, keep educational content
      return !strictTechnicalTerms.some((term) =>
        lowercaseQuestion.includes(term)
      );
    });

    if (validFlashcards.length === 0) {
      console.error("[DEBUG] All flashcards were filtered out");
      // Create fallback flashcards
      const fallbackCards = createFallbackFlashcards(content, source);
      if (fallbackCards.length > 0) {
        console.log(
          "[DEBUG] Using fallback flashcards after filtering:",
          fallbackCards.length
        );
        return fallbackCards;
      }
      throw new Error("Filtered out all flashcards");
    }

    return validFlashcards;
  } catch (error) {
    console.error("Flashcard generation error:", error);
    // Fallback to simple flashcards
    const fallbackCards = createFallbackFlashcards(content, source);
    return fallbackCards;
  }
}

// Generate notes from content using high-quality AI function
export async function generateNotesFromContent(
  content: string,
  source: string
): Promise<
  Array<{
    title: string;
    content: string;
    category: string;
    tags: string[];
  }>
> {
  // Use the high-quality notes generation from azureOpenAI.ts
  return generateNotesFromContentAI(content, source);
}

// Clean note content from unwanted symbols and artifacts
function cleanNoteContent(content: string): string {
  return content
    .replace(/Page \d+:/gi, "") // Remove page markers
    .replace(/^\s*[\*\-\+]\s*/gm, "• ") // Normalize bullet points
    .replace(/[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}\"\'`\n\r\•\*#]/g, "") // Remove weird symbols
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Clean up excessive line breaks
    .replace(/^\s*#+ /, "## ") // Normalize headings
    .trim();
}

// Smart category detection function
function detectCategory(
  content: string,
  source: string,
  suggestedCategory?: string
): string {
  // If AI suggested a good category, use it
  if (suggestedCategory && suggestedCategory !== "General") {
    return suggestedCategory;
  }

  const text = (content + " " + source).toLowerCase();

  // Define category keywords with priority order
  const categories = [
    {
      name: "DevOps",
      keywords: [
        "devops",
        "docker",
        "kubernetes",
        "jenkins",
        "ci/cd",
        "deployment",
        "infrastructure",
        "monitoring",
        "ansible",
        "terraform",
        "pipeline",
      ],
    },
    {
      name: "Programming",
      keywords: [
        "javascript",
        "python",
        "java",
        "react",
        "node",
        "coding",
        "programming",
        "algorithm",
        "function",
        "variable",
        "class",
        "method",
      ],
    },
    {
      name: "Data Science",
      keywords: [
        "machine learning",
        "data science",
        "pandas",
        "numpy",
        "statistics",
        "analysis",
        "dataset",
        "model",
        "prediction",
        "ml",
      ],
    },
    {
      name: "Web Development",
      keywords: [
        "html",
        "css",
        "frontend",
        "backend",
        "web development",
        "bootstrap",
        "responsive",
        "api",
        "rest",
        "http",
      ],
    },
    {
      name: "Database",
      keywords: [
        "sql",
        "database",
        "mysql",
        "postgresql",
        "mongodb",
        "query",
        "table",
        "index",
        "relationship",
        "orm",
      ],
    },
    {
      name: "Cloud Computing",
      keywords: [
        "aws",
        "azure",
        "cloud",
        "serverless",
        "lambda",
        "ec2",
        "s3",
        "cloud computing",
        "gcp",
      ],
    },
    {
      name: "Cybersecurity",
      keywords: [
        "security",
        "encryption",
        "vulnerability",
        "penetration",
        "firewall",
        "authentication",
        "cybersecurity",
        "ssl",
      ],
    },
    {
      name: "Mathematics",
      keywords: [
        "math",
        "calculus",
        "algebra",
        "geometry",
        "statistics",
        "equation",
        "theorem",
        "proof",
        "formula",
      ],
    },
    {
      name: "Physics",
      keywords: [
        "physics",
        "mechanics",
        "thermodynamics",
        "electromagnetism",
        "quantum",
        "force",
        "energy",
        "motion",
      ],
    },
    {
      name: "Chemistry",
      keywords: [
        "chemistry",
        "molecule",
        "atom",
        "chemical",
        "reaction",
        "element",
        "compound",
        "periodic",
      ],
    },
    {
      name: "Biology",
      keywords: [
        "biology",
        "cell",
        "organism",
        "genetics",
        "evolution",
        "ecosystem",
        "anatomy",
        "dna",
      ],
    },
    {
      name: "Business",
      keywords: [
        "business",
        "management",
        "marketing",
        "finance",
        "economics",
        "strategy",
        "leadership",
        "sales",
      ],
    },
    {
      name: "History",
      keywords: [
        "history",
        "historical",
        "ancient",
        "medieval",
        "war",
        "civilization",
        "culture",
        "empire",
      ],
    },
    {
      name: "Literature",
      keywords: [
        "literature",
        "novel",
        "poetry",
        "author",
        "book",
        "writing",
        "literary",
        "poem",
      ],
    },
    {
      name: "Language",
      keywords: [
        "language",
        "grammar",
        "vocabulary",
        "linguistics",
        "translation",
        "speaking",
        "english",
      ],
    },
  ];

  // Find the best matching category
  let bestMatch = { name: "General", score: 0 };

  for (const category of categories) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (text.includes(keyword)) {
        score += keyword.length; // Longer keywords get higher weight
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { name: category.name, score };
    }
  }

  return bestMatch.name;
}

// Extract relevant tags from content
function extractTags(content: string, source: string): string[] {
  const text = (content + " " + source).toLowerCase();
  const commonTags = [
    "tutorial",
    "guide",
    "reference",
    "examples",
    "documentation",
    "notes",
    "beginner",
    "advanced",
    "practical",
    "theory",
    "concepts",
    "fundamentals",
    "tips",
    "best practices",
    "troubleshooting",
    "configuration",
    "setup",
  ];

  const foundTags = commonTags.filter((tag) => text.includes(tag));

  // Add file type as tag
  if (source.includes(".pdf")) foundTags.push("pdf");
  if (source.includes(".txt")) foundTags.push("text");
  if (source.includes(".md")) foundTags.push("markdown");
  if (source.includes(".jpg") || source.includes(".png"))
    foundTags.push("image");

  return foundTags.slice(0, 5); // Limit to 5 tags
}

// Manual fallback schedule extraction using regex patterns
function extractScheduleFallback(
  content: string,
  source: string
): Array<{
  title: string;
  time: string;
  date: string;
  type: "assignment" | "study" | "exam" | "note";
}> {
  console.log("🗓️ [SCHEDULE] Running fallback extraction...");
  const items: Array<{
    title: string;
    time: string;
    date: string;
    type: "assignment" | "study" | "exam" | "note";
  }> = [];

  // Enhanced patterns for better extraction
  const patterns = [
    // Assignment patterns
    {
      regex:
        /(assignment|homework|project|essay|paper)\s+(?:due\s+)?(?:on\s+)?([^\n]*(?:(?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})[^\n]*)?)/gi,
      type: "assignment" as const,
      defaultTime: "23:59",
    },
    // Exam patterns
    {
      regex:
        /(exam|test|quiz|midterm|final)\s*:?\s*([^\n]*(?:(?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})[^\n]*)?)/gi,
      type: "exam" as const,
      defaultTime: "09:00",
    },
    // Class/lecture patterns
    {
      regex:
        /(class|lecture|session)\s*:?\s*([^\n]*(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2})[^\n]*)?)/gi,
      type: "study" as const,
      defaultTime: "10:00",
    },
    // Due date patterns
    {
      regex:
        /due\s*:?\s*([^\n]*(?:(?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})[^\n]*)?)/gi,
      type: "assignment" as const,
      defaultTime: "23:59",
    },
  ];

  // Process each pattern
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.regex.exec(content)) && items.length < 10) {
      const title = match[1] + (match[2] ? `: ${match[2].trim()}` : "");
      const dateText = match[2] || "";

      // Try to extract a date
      const dateMatch = dateText.match(
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/i
      );

      let date = new Date().toISOString().split("T")[0]; // Default to today
      if (dateMatch) {
        const parsedDate = new Date(dateMatch[0]);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split("T")[0];
        }
      } else {
        // Default to next week if no date found
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        date = nextWeek.toISOString().split("T")[0];
      }

      items.push({
        title: title.substring(0, 100), // Limit title length
        time: pattern.defaultTime,
        date: date,
        type: pattern.type,
      });
    }
  });

  // If no items found, create a general study session
  if (items.length === 0) {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    items.push({
      title: `Study session from ${source}`,
      time: "14:00",
      date: nextWeek.toISOString().split("T")[0],
      type: "study",
    });
  }

  console.log(`🗓️ [SCHEDULE] Fallback extracted ${items.length} items`);
  return items.slice(0, 5); // Limit to 5 items

  return items;
}

// Generate schedule items from content using AI - ENHANCED to only extract important events
export async function generateScheduleFromContent(
  content: string,
  source: string
): Promise<
  Array<{
    title: string;
    time: string;
    date: string;
    type: "assignment" | "study" | "exam" | "note";
  }>
> {
  console.log("🗓️ [SCHEDULE] Generating schedule from content:", source);
  console.log("🗓️ [SCHEDULE] Content preview:", content.substring(0, 200));

  // First, check if content actually contains schedule-worthy information
  const hasScheduleContent = detectScheduleWorthyContent(content);
  if (!hasScheduleContent) {
    console.log(
      "🗓️ [SCHEDULE] No schedule-worthy content detected, skipping..."
    );
    return [];
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an ADVANCED AI schedule generator that extracts ALL IMPORTANT schedule items from educational content.

⚠️ EXTRACTION CRITERIA:
✅ ALWAYS CREATE schedule items for:
• Assignment deadlines with specific due dates
• Exam dates and times  
• Project submission deadlines
• Class/lecture schedules with specific times
• Lab sessions with scheduled times
• Tutorial/seminar sessions
• Important deadline dates (midterm, final, presentation)
• Quiz dates and times
• TIMETABLE entries (regular class schedules)
• Weekly recurring classes
• Office hours
• Study sessions with specific times

✅ ALSO EXTRACT from TIMETABLES/CLASS SCHEDULES:
• Regular weekly classes (e.g., "Math Mon 9:00 AM")
• Lab periods with days/times
• Lecture halls and timings
• Recurring academic activities
• Course schedules by day

❌ DO NOT CREATE schedule items for:
• Pure study topics without dates/times
• General course descriptions
• Learning objectives without schedules
• Historical information
• Theoretical explanations only

🎯 SPECIAL HANDLING FOR TIMETABLES:
- Extract ALL class sessions with days and times
- Convert weekly patterns to schedule items
- Include course names, times, and days
- If time range given, use start time
- Mark recurring classes as "class" type

🎯 DATE HANDLING:
- For recurring weekly items, use next occurrence of that day
- Convert relative dates (e.g., "next Monday") to actual dates
- If no year specified, assume current academic year (2025)
- For weekly classes, create entries for the next few weeks

RETURN ONLY A VALID JSON ARRAY:
[
  {
    "title": "Course Name/Assignment Name",
    "time": "HH:MM", 
    "date": "YYYY-MM-DD",
    "type": "assignment|exam|study|class"
  }
]

SPECIAL TIMETABLE PROCESSING INSTRUCTIONS:
- For class schedules like "Math 9:00 AM - 10:30 AM Room 101":
  Extract as: {"title": "Math", "time": "09:00", "endTime": "10:30", "type": "class", "room": "Room 101"}
- For instructor info like "Prof. Smith teaches Physics":
  Include instructor in title: {"title": "Physics - Prof. Smith", "type": "class"}
- For multiple days like "Mon/Wed/Fri 10:00 AM":
  Create separate entries for each day
- For break times like "Tea Break 10:30-11:00":
  Extract as: {"title": "Tea Break", "time": "10:30", "endTime": "11:00", "type": "study"}

Examples of VALID schedule items:
- "Assignment 1 due September 15" → assignment
- "Midterm exam on October 3 at 2 PM" → exam  
- "Project presentation Monday 9 AM" → assignment
- "Lab session every Wednesday 3 PM" → class
- "Math class Monday 9:00 AM" → class
- "Physics lecture Tue/Thu 10:30 AM" → class
- "CS101 Mon/Wed/Fri 2:00 PM Room 101" → class
- "Office hours Tuesday 1-3 PM" → study

Examples for TIMETABLES:
- Extract "Math Mon 9AM" as class on next Monday
- Extract "Lab Wed 2PM" as class on next Wednesday  
- Extract "Lecture MTWTh 10AM" as multiple class entries

TIMETABLE PROCESSING:
- For "Mon/Wed/Fri", create separate entries for each day
- Use reasonable dates (next occurrence of each day)
- Include room numbers in title if provided
- Mark all regular classes as type "class"

IF NO VALID TIME-SENSITIVE EVENTS FOUND, RETURN []`,
    },
    {
      role: "user",
      content: `ONLY extract time-sensitive events with specific dates from this content:\n\nSource: ${source}\n\nContent:\n${content.substring(
        0,
        4000
      )}`,
    },
  ];

  try {
    console.log("🗓️ [SCHEDULE] Calling AI for schedule generation...");
    const response = await callAzureOpenAI(messages);
    console.log("🗓️ [SCHEDULE] AI Response:", response);

    if (!response || response.trim().length === 0) {
      throw new Error("Empty AI response");
    }

    const cleanResponse = response.trim().replace(/```json\n?|\n?```/g, "");
    console.log("🗓️ [SCHEDULE] Cleaned response:", cleanResponse);

    if (!cleanResponse || cleanResponse.trim().length === 0) {
      throw new Error("Empty cleaned response");
    }

    const scheduleItems = JSON.parse(cleanResponse);
    console.log("🗓️ [SCHEDULE] Parsed items:", scheduleItems);

    // Additional validation to ensure only important events
    const validItems = Array.isArray(scheduleItems)
      ? scheduleItems.filter((item) => validateScheduleItem(item))
      : [];

    console.log("🗓️ [SCHEDULE] Valid important events:", validItems.length);

    return validItems;
  } catch (error) {
    console.error("🗓️ [SCHEDULE] Error generating schedule items:", error);
    console.log("🗓️ [SCHEDULE] Falling back to manual extraction...");

    // Enhanced fallback: Only extract dates with clear time-sensitive context
    const fallbackItems = extractScheduleFallbackEnhanced(content, source);
    console.log("🗓️ [SCHEDULE] Enhanced fallback items:", fallbackItems);
    return fallbackItems;
  }
}

// Detect if content contains schedule-worthy information
function detectScheduleWorthyContent(content: string): boolean {
  const scheduleIndicators = [
    // Assignment patterns
    /\b(?:assignment|homework|project)\s+(?:due|deadline|submit)/i,
    /\bdue\s+(?:date|on|by)\b/i,
    /\bdeadline\s*:?\s*\d/i,

    // Exam patterns
    /\b(?:exam|test|quiz|midterm|final)\s+(?:on|date|scheduled)/i,
    /\bexam\s*:?\s*\w+\s+\d/i,

    // Class schedule patterns - ENHANCED
    /\b(?:class|lecture|lab|session)\s+(?:schedule|time|meets)/i,
    /\bmeets?\s+(?:every|on|at)\s+\w+/i,
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /\btimetable\b/i,
    /\bschedule\b/i,
    /\b(?:room|hall|venue)\s*:?\s*\w+/i,

    // Date patterns with context
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
    /\b\d{1,2}-\d{1,2}-\d{2,4}\b/,

    // Time patterns with academic context
    /\b\d{1,2}:\d{2}\s*(?:am|pm)\b/i,
    /\bweekly\s+(?:on|at)\b/i,
    /\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/i, // Time ranges

    // Timetable specific patterns
    /\b(?:period|slot|timing|duration)\b/i,
    /\b(?:semester|term|academic)\s+(?:schedule|calendar)/i,
  ];

  const hasDateContext = scheduleIndicators.some((pattern) =>
    pattern.test(content)
  );

  // For timetables, be more lenient - if filename or content suggests schedule, accept it
  const filename = content.toLowerCase();
  const isScheduleFile =
    /\b(?:timetable|schedule|calendar|exam|class|syllabus)\b/i.test(filename);

  // Additional check: content should not be purely theoretical (but be more lenient for schedules)
  const theoreticalIndicators = [
    /\b(?:overview|introduction|definition|concept|theory|principle)\b/i,
    /\b(?:understand|learn|study|review|covered|topics)\b/i,
  ];

  const contentWords = content.toLowerCase().split(/\s+/);
  const theoreticalRatio =
    theoreticalIndicators.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0) / Math.max(contentWords.length / 100, 1);

  // If it's a schedule file or has schedule indicators, be more accepting
  if (isScheduleFile || hasDateContext) {
    return true;
  }

  // If content is mostly theoretical and has no clear schedule indicators, skip
  return hasDateContext && theoreticalRatio < 5;
}

// Validate that a schedule item is actually important
function validateScheduleItem(item: any): boolean {
  if (!item || !item.title || !item.date || !item.type) {
    return false;
  }

  const title = item.title.toLowerCase();

  // Check for important keywords - ENHANCED for timetables
  const importantKeywords = [
    "assignment",
    "homework",
    "project",
    "exam",
    "test",
    "quiz",
    "midterm",
    "final",
    "presentation",
    "deadline",
    "due",
    "lab",
    "class",
    "lecture",
    "meeting",
    "interview",
    "submission",
    "tutorial",
    "seminar",
    "workshop",
    "period",
    "session",
    "practical",
    "theory",
  ];

  const hasImportantKeyword = importantKeywords.some((keyword) =>
    title.includes(keyword)
  );

  // For timetable items, also accept day-based patterns
  const dayPattern =
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
  const timePattern = /\d{1,2}:\d{2}/;
  const hasTimeInfo =
    dayPattern.test(title) ||
    timePattern.test(title) ||
    timePattern.test(item.time || "");

  // Reject only very generic or vague titles
  const genericTitles = [
    "overview",
    "introduction",
    "concepts",
    "general notes",
    "summary",
    "background",
  ];

  const isGeneric = genericTitles.some(
    (generic) => title === generic || title.startsWith(generic + " ")
  );

  // Accept if has important keyword, time info, or is not generic
  return (hasImportantKeyword || hasTimeInfo) && !isGeneric;
}

// Enhanced fallback schedule extraction - only important events
function extractScheduleFallbackEnhanced(
  content: string,
  source: string
): Array<{
  title: string;
  time: string;
  date: string;
  type: "assignment" | "study" | "exam" | "note";
}> {
  const items: Array<{
    title: string;
    time: string;
    date: string;
    type: "assignment" | "study" | "exam" | "note";
  }> = [];

  console.log("🗓️ [SCHEDULE] Running enhanced fallback extraction...");

  // Enhanced patterns for important events AND timetables
  const importantPatterns = [
    // Assignment deadlines
    {
      pattern:
        /(?:assignment|homework|project)\s+.*?(?:due|deadline).*?(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/gi,
      type: "assignment" as const,
      time: "23:59",
    },

    // Exam dates
    {
      pattern:
        /(?:exam|test|quiz|midterm|final).*?(?:on|scheduled).*?(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/gi,
      type: "exam" as const,
      time: "09:00",
    },

    // Class schedules with specific times
    {
      pattern:
        /(?:class|lecture|lab).*?(?:meets?|scheduled).*?(\w+).*?(\d{1,2}:\d{2})/gi,
      type: "study" as const,
      time: "10:00",
    },

    // Timetable patterns - day and time combinations
    {
      pattern:
        /(monday|tuesday|wednesday|thursday|friday|saturday|sunday).*?(\d{1,2}:\d{2}(?:\s*(?:am|pm))?)/gi,
      type: "study" as const,
      time: "10:00",
    },

    // Course codes with days and times
    {
      pattern:
        /([A-Z]{2,4}\d{3}[A-Z]?).*?(monday|tuesday|wednesday|thursday|friday).*?(\d{1,2}:\d{2})/gi,
      type: "study" as const,
      time: "10:00",
    },

    // Time ranges in timetables
    {
      pattern:
        /(\d{1,2}:\d{2})\s*-\s*\d{1,2}:\d{2}.*?(monday|tuesday|wednesday|thursday|friday)/gi,
      type: "study" as const,
      time: "10:00",
    },

    // Enhanced timetable patterns - Subject codes with instructors and rooms
    {
      pattern:
        /([A-Z]{2,4}(?:\/[A-Z]{2,4})*)\s*[-–]\s*([A-Z]{2,3})\s*[-–]\s*(M[ABC]\d+)/gi,
      type: "study" as const,
      time: "10:00",
    },

    // Subject with time range and room
    {
      pattern:
        /(\w+(?:\s+\w+)*)\s*[-–]\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*\(?(Room\s*\w+|M[ABC]\d+)\)?/gi,
      type: "study" as const,
      time: "10:00",
    },

    // Tea/Coffee breaks
    {
      pattern: /(☕|coffee|tea)\s*break.*?(\d{1,2}:\d{2})/gi,
      type: "study" as const,
      time: "10:30",
    },
  ];

  // Only extract if patterns match important academic events
  importantPatterns.forEach(({ pattern, type, time }) => {
    let match;
    while ((match = pattern.exec(content)) !== null && items.length < 5) {
      const dateStr = match[1];
      if (dateStr && dateStr.length > 3) {
        const title = match[0].replace(/\s+/g, " ").trim();

        // Only add if title contains important academic keywords
        if (validateScheduleItem({ title, date: "2025-08-15", type, time })) {
          items.push({
            title: title.substring(0, 50),
            time: match[2] || time,
            date: parseDate(dateStr),
            type,
          });
        }
      }
    }
  });

  console.log(
    `🗓️ [SCHEDULE] Enhanced fallback extracted ${items.length} important items`
  );
  return items;
}

// Helper function to parse dates
function parseDate(dateStr: string): string {
  try {
    // Handle common date formats
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();

    const months = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };

    const days = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
      sun: 0,
    };

    // Handle day of week (for timetables)
    const dayMatch = dateStr
      .toLowerCase()
      .match(
        /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/
      );
    if (dayMatch) {
      const targetDay = days[dayMatch[1] as keyof typeof days];
      const today = currentDate.getDay();

      // Calculate days until next occurrence of this day
      let daysUntil = targetDay - today;
      if (daysUntil <= 0) daysUntil += 7; // Next week if day has passed

      const targetDate = new Date(currentDate);
      targetDate.setDate(currentDate.getDate() + daysUntil);

      const month = (targetDate.getMonth() + 1).toString().padStart(2, "0");
      const day = targetDate.getDate().toString().padStart(2, "0");
      return `${targetDate.getFullYear()}-${month}-${day}`;
    }

    // Match "Month Day" format
    const monthDayMatch = dateStr.toLowerCase().match(/(\w+)\s+(\d{1,2})/);
    if (monthDayMatch) {
      const month = months[monthDayMatch[1] as keyof typeof months];
      if (month) {
        const day = monthDayMatch[2].padStart(2, "0");
        return `${currentYear}-${month}-${day}`;
      }
    }

    // Fallback to tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  } catch {
    // Default fallback
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }
}

// Main file processing function
export async function processUploadedFile(
  file: File
): Promise<FileProcessingResult> {
  try {
    console.log("Processing file:", file.name, file.type);

    // Extract content from file
    const content = await extractFileContent(file);

    if (!content || content.trim().length < 10) {
      throw new Error("File content is too short or empty");
    }

    console.log("Extracted content length:", content.length);

    // Generate flashcards, notes, and schedule items in parallel
    const [flashcards, notes, scheduleItems] = await Promise.all([
      generateFlashcardsFromContent(content, file.name),
      generateNotesFromContent(content, file.name),
      generateScheduleFromContent(content, file.name),
    ]);

    // Generate a summary
    const summary = `Processed ${file.name}: Generated ${flashcards.length} flashcards, ${notes.length} notes, ${scheduleItems.length} schedule items.`;

    return {
      success: true,
      content,
      flashcards,
      notes,
      scheduleItems,
      summary,
    };
  } catch (error) {
    console.error("File processing error:", error);
    return {
      success: false,
      content: "",
      flashcards: [],
      notes: [],
      scheduleItems: [],
      summary: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

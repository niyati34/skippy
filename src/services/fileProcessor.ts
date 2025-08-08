import { callAzureOpenAI, ChatMessage } from "./azureOpenAI";
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

        // Combine text items into readable text
        const pageText = textContent.items
          .map((item: any) => (item.str ? item.str : ""))
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

    // Clean up the extracted text
    fullText = fullText
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .replace(/^\s+|\s+$/g, "")
      .replace(/\s+/g, " ")
      .replace(/[^\x20-\x7E\s]/g, "");

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

// Generate notes from content using AI
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
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an expert educational content organizer. Create comprehensive, well-structured study notes from the provided content.

IMPORTANT FORMATTING RULES:
- Clean up any unwanted symbols, encoding artifacts, or metadata
- Remove PDF artifacts like "Page X:", metadata, headers/footers
- Focus only on meaningful educational content
- Use proper markdown formatting for structure
- Create clear headings and bullet points

CATEGORIZATION RULES:
- Analyze the content and determine the main subject/topic
- Use specific, clear category names like: "DevOps", "Programming", "Mathematics", "Science", "History", etc.
- If content covers multiple topics, choose the primary focus
- Use consistent naming (e.g., always "DevOps" not "Dev Ops" or "Development Operations")

RETURN ONLY A VALID JSON ARRAY with this exact structure:
[
  {
    "title": "Clear, descriptive note title (max 60 chars)",
    "content": "Well-formatted, clean content in markdown",
    "category": "Single, specific subject category",
    "tags": ["relevant", "educational", "keywords"]
  }
]

CONTENT STRUCTURE:
- Start with main concepts and key points
- Include important definitions
- Add examples and practical applications
- End with summary or takeaways
- Use bullet points, numbered lists, and headers for clarity

Make the notes comprehensive but well-organized, perfect for studying.

If the content appears to be corrupted, binary, or lacks educational value, return an empty array [].
RETURN ONLY THE JSON ARRAY, no other text or explanations.`,
    },
    {
      role: "user",
      content: `Create study notes from this content. Source: ${source}\n\nContent:\n${content.substring(
        0,
        4000
      )}`,
    },
  ];

  try {
    const response = await callAzureOpenAI(messages);
    const cleanResponse = response.trim().replace(/```json\n?|\n?```/g, "");

    const notes = JSON.parse(cleanResponse);

    // Validate that we have meaningful notes
    if (!Array.isArray(notes) || notes.length === 0) {
      throw new Error(
        "No educational content found suitable for note generation"
      );
    }

    // Process and clean each note
    const processedNotes = notes.map((note) => ({
      title: note.title || "Study Note",
      content: cleanNoteContent(note.content || ""),
      category: detectCategory(content, source, note.category),
      tags: Array.isArray(note.tags)
        ? note.tags.slice(0, 5)
        : extractTags(content, source),
    }));

    return processedNotes;
  } catch (error) {
    console.error("Error generating notes:", error);

    // Fallback: create a single comprehensive note
    const autoCategory = detectCategory(content, source);
    const cleanContent = cleanNoteContent(content);

    if (cleanContent.length < 50) {
      throw new Error(
        "Content too short or corrupted to generate meaningful notes"
      );
    }

    return [
      {
        title: `${autoCategory} Notes`,
        content:
          cleanContent.substring(0, 2000) +
          (cleanContent.length > 2000 ? "..." : ""),
        category: autoCategory,
        tags: extractTags(content, source),
      },
    ];
  }
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

// Generate schedule items from content using AI
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
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an AI schedule generator. Extract and create schedule items from the provided content.

RETURN ONLY A VALID JSON ARRAY with this exact structure:
[
  {
    "title": "Task/Event title",
    "time": "HH:MM format (24-hour)",
    "date": "YYYY-MM-DD format", 
    "type": "assignment" | "study" | "exam" | "note"
  }
]

Guidelines:
- Only create schedule items if there are clear dates, deadlines, or time-sensitive tasks
- Use current year if year is not specified
- Set reasonable default times if not specified (e.g., 09:00 for morning, 14:00 for afternoon)
- Types: "assignment" for homework/projects, "study" for study sessions, "exam" for tests, "note" for reminders
- If no schedule items are found, return an empty array []
- RETURN ONLY THE JSON ARRAY, no other text`,
    },
    {
      role: "user",
      content: `Extract schedule items from this content (source: ${source}):\n\n${content.substring(
        0,
        2000
      )}`,
    },
  ];

  try {
    const response = await callAzureOpenAI(messages);
    const cleanResponse = response.trim().replace(/```json\n?|\n?```/g, "");

    const scheduleItems = JSON.parse(cleanResponse);
    return Array.isArray(scheduleItems) ? scheduleItems : [];
  } catch (error) {
    console.error("Error generating schedule items:", error);
    return [];
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

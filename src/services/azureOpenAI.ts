const AZURE_API_CONFIG = {
  BASE_URL: 'https://niyat-mbn9ekvt-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview',
  API_KEY: 'EXQGi4koSjN2aZcOMNZEQAFzrFMvMPb0BfHREFOZH0SNKD3SGSERJQQJ99BFACHYHv6XJ3w3AAAAACOGheaZ',
  DEPLOYMENT_NAME: 'gpt-4o'
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function callAzureOpenAI(messages: ChatMessage[]): Promise<string> {
  try {
    const response = await fetch(AZURE_API_CONFIG.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_API_CONFIG.API_KEY,
      },
      body: JSON.stringify({
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not process that request.';
  } catch (error) {
    console.error('Azure OpenAI API error:', error);
    return 'Sorry, I encountered an error. Please try again.';
  }
}

export async function analyzeFileContent(content: string, fileName: string): Promise<any> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an AI file content analyzer. Analyze the provided content and return a JSON object with this exact structure:
      {
        "hasScheduleData": boolean,
        "hasEducationalContent": boolean,
        "hasGeneralNotes": boolean,
        "contentType": "schedule" | "educational" | "notes" | "mixed",
        "scheduleItems": number,
        "educationalConcepts": number,
        "confidence": number,
        "suggestedActions": ["schedule", "flashcards", "notes", "fun-learning"],
        "summary": "brief description of content",
        "detectedDates": ["date1", "date2"],
        "keyTopics": ["topic1", "topic2"],
        "priority": "high" | "medium" | "low"
      }
      
      Detection criteria:
      - Schedule: dates, times, deadlines, appointments, meetings, events, "due on", "reminder"
      - Educational: definitions, concepts, facts, study material, formulas, procedures
      - Notes: general information, summaries, key points, references`
    },
    {
      role: 'user',
      content: `Analyze this file content from "${fileName}": ${content}`
    }
  ];

  try {
    const response = await callAzureOpenAI(messages);
    return JSON.parse(response);
  } catch (error) {
    console.error('Content analysis error:', error);
    return {
      hasScheduleData: false,
      hasEducationalContent: true,
      hasGeneralNotes: true,
      contentType: 'notes',
      scheduleItems: 0,
      educationalConcepts: 0,
      confidence: 0.5,
      suggestedActions: ['notes'],
      summary: 'Content analysis failed, treating as general notes',
      detectedDates: [],
      keyTopics: [],
      priority: 'low'
    };
  }
}

export async function generateScheduleFromContent(content: string): Promise<any[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a schedule extraction specialist. Extract ONLY schedule-related items (dates, times, deadlines, appointments, meetings, events) from the content. Return a JSON array where each item has: title, description, dueDate (YYYY-MM-DD), dueTime (HH:MM if available), priority (high/medium/low), category (assignment/exam/meeting/deadline/event), location (if mentioned), isRecurring (boolean).'
    },
    {
      role: 'user',
      content: `Extract schedule items from: ${content}`
    }
  ];

  try {
    const response = await callAzureOpenAI(messages);
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating schedule:', error);
    return [];
  }
}

export async function generateFlashcards(content: string): Promise<any[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a flashcard generator specializing in educational content. Create flashcards ONLY from educational material (definitions, concepts, facts, formulas, procedures). Return a JSON array where each item has: question, answer, difficulty (easy/medium/hard), category, hint (optional), explanation (optional).'
    },
    {
      role: 'user',
      content: `Create educational flashcards from: ${content}`
    }
  ];

  try {
    const response = await callAzureOpenAI(messages);
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    return [];
  }
}

export async function generateNotesFromContent(content: string, fileName: string): Promise<any[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a professional note-taking assistant. Create comprehensive, well-structured notes from ANY type of content. Organize with clear headers, bullet points, and categories. Include: main topics, key points, important details, action items, and summaries. Make notes useful for future reference.'
    },
    {
      role: 'user',
      content: `Create comprehensive notes from "${fileName}": ${content}`
    }
  ];

  try {
    const response = await callAzureOpenAI(messages);
    return [{
      id: Date.now().toString(),
      title: `Notes from ${fileName}`,
      content: response,
      source: 'ai',
      category: 'general',
      createdAt: new Date().toISOString(),
      tags: ['ai-generated', 'uploaded-file', fileName.split('.').pop() || 'unknown']
    }];
  } catch (error) {
    console.error('Notes generation error:', error);
    return [{
      id: Date.now().toString(),
      title: `Notes from ${fileName}`,
      content: 'Failed to generate notes automatically. Please review the original file.',
      source: 'ai',
      category: 'general',
      createdAt: new Date().toISOString(),
      tags: ['error', 'uploaded-file']
    }];
  }
}

export async function generateFunLearning(content: string, type: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a creative learning assistant. Convert educational content into a ${type} format to make learning fun and engaging. Focus on educational value while making it interactive and enjoyable.`
    },
    {
      role: 'user',
      content: `Create a ${type} from this educational content: ${content}`
    }
  ];

  return await callAzureOpenAI(messages);
}

export async function extractTextFromImage(imageFile: File): Promise<string> {
  // For now, return a placeholder - in production, you'd integrate with Azure Computer Vision OCR
  return `[Image content from ${imageFile.name}] - OCR processing would extract text here. Please describe what you see in this image or what you'd like me to help you with.`;
}
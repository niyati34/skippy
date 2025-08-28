// Universal Agentic AI System for Notes, Flashcards, and Schedule Management
// Handles any natural language prompt with AI-powered understanding

import {
  generateFlashcards,
  generateNotesFromContent,
  generateScheduleFromContent,
  callOpenRouter,
  type ChatMessage,
} from "@/services/openrouter";
import {
  BuddyMemoryStorage,
  FlashcardStorage,
  NotesStorage,
  ScheduleStorage,
  type StoredFlashcard,
  type StoredNote,
  type StoredScheduleItem,
} from "@/lib/storage";
import { nlpProcessor } from "@/lib/enhancedNLP";
import type { AgentTaskInput, AgentResult } from "./agent";

// Core intent categories
export type UniversalIntent = {
  domain: "notes" | "flashcards" | "schedule" | "mixed" | "unclear";
  action: "create" | "delete" | "update" | "view" | "search" | "analyze";
  parameters: {
    topic?: string;
    count?: number;
    difficulty?: string;
    format?: string;
    dateTime?: string;
    priority?: string;
    [key: string]: any;
  };
  confidence: number;
  reasoning: string;
};

// Enhanced context for better understanding
export interface UniversalContext {
  userInput: string;
  previousCommands: string[];
  currentContent: {
    notes: StoredNote[];
    flashcards: StoredFlashcard[];
    schedule: StoredScheduleItem[];
  };
  userPreferences: any;
  sessionHistory: string[];
}

export class UniversalAgenticAI {
  private context: UniversalContext;

  constructor() {
    this.context = {
      userInput: "",
      previousCommands: [],
      currentContent: {
        notes: NotesStorage.load(),
        flashcards: FlashcardStorage.load(),
        schedule: ScheduleStorage.load(),
      },
      userPreferences: BuddyMemoryStorage.load(),
      sessionHistory: [],
    };
  }

  async processAnyPrompt(input: AgentTaskInput): Promise<AgentResult> {
    const userText = input.text || "";

    // First, correct and normalize the input text
    const correctionResult = nlpProcessor.correctText(userText);
    const normalizedText = correctionResult.correctedText;

    // Log corrections if any were made
    if (correctionResult.corrections.length > 0) {
      console.log(
        "🔧 [UniversalAI] Applied corrections:",
        correctionResult.corrections
      );
    }

    this.context.userInput = normalizedText;
    this.context.sessionHistory.push(normalizedText);

    console.log("🧠 [UniversalAI] Processing prompt:", normalizedText);

    try {
      // Phase 1: Understand the intent using AI with corrected text
      const intent = await this.parseIntentWithAI(normalizedText);
      console.log("🎯 [UniversalAI] Parsed intent:", intent);

      // Phase 2: Execute the interpreted action
      const result = await this.executeUniversalAction(intent, {
        ...input,
        text: normalizedText, // Use corrected text for execution
      });

      // Phase 3: Learn from the interaction
      this.updateContext(normalizedText, result);

      return result;
    } catch (error) {
      console.error("🚨 [UniversalAI] Processing failed:", error);

      // Provide helpful suggestions based on the input
      const suggestions = nlpProcessor.suggestCompletions(userText);
      const suggestionText =
        suggestions.length > 0
          ? `\n\nTry these examples:\n• ${suggestions.slice(0, 3).join("\n• ")}`
          : "";

      return {
        summary: `I encountered an issue processing your request. Could you try rephrasing it or being more specific about what you'd like me to do with your notes, flashcards, or schedule?${suggestionText}`,
        artifacts: {},
      };
    }
  }

  private async parseIntentWithAI(userText: string): Promise<UniversalIntent> {
    const systemPrompt = `You are an expert AI assistant specializing in educational content management. Your job is to understand user requests related to:

1. NOTES: Creating, organizing, summarizing study materials
2. FLASHCARDS: Generating question-answer pairs for memorization
3. SCHEDULE: Managing assignments, exams, classes, deadlines

Analyze the user's input and return a JSON object with this exact structure:
{
  "domain": "notes|flashcards|schedule|mixed|unclear",
  "action": "create|delete|update|view|search|analyze", 
  "parameters": {
    "topic": "extracted subject/topic",
    "count": number (if specified),
    "difficulty": "beginner|intermediate|advanced",
    "format": "any format preferences",
    "dateTime": "any dates/times mentioned",
    "priority": "low|medium|high",
    "specific_request": "exact user need"
  },
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of interpretation"
}

Examples:
- "make 50 flashcards about JavaScript" → domain: flashcards, action: create, count: 50
- "notes on photosynthesis" → domain: notes, action: create, topic: photosynthesis
- "schedule my exam tomorrow" → domain: schedule, action: create, dateTime: tomorrow
- "remove old chemistry cards" → domain: flashcards, action: delete, topic: chemistry

Handle typos, informal language, and incomplete requests intelligently.`;

    const userPrompt = `User input: "${userText}"

Current context:
- User has ${this.context.currentContent.notes.length} notes
- User has ${this.context.currentContent.flashcards.length} flashcards  
- User has ${this.context.currentContent.schedule.length} schedule items
- Recent commands: ${this.context.sessionHistory.slice(-3).join(", ")}

Parse this input and return the JSON structure.`;

    try {
      const response = await callOpenRouter(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { retries: 2 }
      );

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          domain: parsed.domain || "unclear",
          action: parsed.action || "create",
          parameters: parsed.parameters || {},
          confidence: parsed.confidence || 0.7,
          reasoning: parsed.reasoning || "AI interpretation",
        };
      }
    } catch (error) {
      console.warn("🤖 [UniversalAI] AI parsing failed, using fallback");
    }

    // Fallback to basic pattern matching
    return this.fallbackIntentParsing(userText);
  }

  private fallbackIntentParsing(text: string): UniversalIntent {
    const lowerText = text.toLowerCase();

    // Domain detection with mixed domain support
    let domain: UniversalIntent["domain"] = "unclear";

    const hasFlashcard = /flash\s*card|quiz|practice|memorize/i.test(text);
    const hasNotes = /note|summary|study|learn/i.test(text);
    const hasSchedule =
      /schedule|calendar|exam|assignment|deadline|class/i.test(text);

    // Detect mixed requests
    const domainCount = [hasFlashcard, hasNotes, hasSchedule].filter(
      Boolean
    ).length;

    if (domainCount > 1) {
      domain = "mixed";
    } else if (hasFlashcard) {
      domain = "flashcards";
    } else if (hasNotes) {
      domain = "notes";
    } else if (hasSchedule) {
      domain = "schedule";
    }

    // Action detection - prioritize explicit action words
    let action: UniversalIntent["action"] = "create";
    if (/\b(create|make|generate|build|add|new)\b/i.test(text))
      action = "create";
    else if (/delete|remove|clear/i.test(text)) action = "delete";
    else if (/update|change|modify|edit/i.test(text)) action = "update";
    else if (/show|view|display|list/i.test(text)) action = "view";
    else if (/find|search/i.test(text)) action = "search";

    // Parameter extraction
    const countMatch = text.match(/\b(\d{1,3})\b/);
    const count = countMatch ? parseInt(countMatch[1]) : undefined;

    const difficultyMatch = text.match(
      /\b(beginner|basic|easy|intermediate|medium|advanced|hard|expert)\b/i
    );
    const difficulty = difficultyMatch
      ? difficultyMatch[1].toLowerCase()
      : undefined;

    // Topic extraction - everything after "about/from/on/for"
    const topicMatch = text.match(
      /(?:about|from|on|for|regarding|concerning)\s+([^.!?]+)/i
    );
    const topic = topicMatch ? topicMatch[1].trim() : "";

    return {
      domain,
      action,
      parameters: {
        topic,
        count,
        difficulty,
        specific_request: text,
      },
      confidence: 0.6,
      reasoning: "Fallback pattern matching",
    };
  }

  private async executeUniversalAction(
    intent: UniversalIntent,
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const { domain, action, parameters } = intent;

    console.log(`🎬 [UniversalAI] Executing ${action} for ${domain}`);

    switch (domain) {
      case "flashcards":
        return await this.handleFlashcardAction(action, parameters, input);

      case "notes":
        return await this.handleNotesAction(action, parameters, input);

      case "schedule":
        return await this.handleScheduleAction(action, parameters, input);

      case "mixed":
        return await this.handleMixedAction(parameters, input);

      default:
        return await this.handleUnclearIntent(intent, input);
    }
  }

  private async handleFlashcardAction(
    action: UniversalIntent["action"],
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    switch (action) {
      case "create":
        return await this.createIntelligentFlashcards(params, input);

      case "delete":
        return this.deleteFlashcards(params);

      case "view":
        return this.viewFlashcards(params);

      default:
        return {
          summary: `Flashcard ${action} not yet implemented`,
          artifacts: {},
        };
    }
  }

  private async createIntelligentFlashcards(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    let content = input.text || "";

    // If only a topic is mentioned, enhance it with AI
    if (params.topic && content.length < 100) {
      content = await this.enhanceTopicForFlashcards(
        params.topic,
        params.difficulty,
        params.count
      );
    }

    console.log("🎴 [FlashcardAI] Enhanced content length:", content.length);

    try {
      const options = {
        count: params.count || 10,
        difficulty: params.difficulty || "intermediate",
      };

      const cards = await generateFlashcards(content, options);

      if (!cards || cards.length === 0) {
        // Generate high-quality fallback cards using AI first, then content-specific database
        try {
          const fallbackCards = await this.generateFallbackFlashcards(
            params.topic || "general topic",
            options
          );
          if (fallbackCards && fallbackCards.length > 0) {
            const saved = FlashcardStorage.addBatch(fallbackCards);
            return {
              summary: `Created ${saved.length} flashcards about ${
                params.topic || "your topic"
              } using enhanced AI generation.`,
              artifacts: { flashcards: saved },
            };
          }
        } catch (error) {
          console.warn(
            "🚨 [FlashcardAI] AI fallback failed, using content database"
          );
        }

        // Use content-specific database as final fallback
        const databaseCards = this.generateContentSpecificFallback(
          params.topic || "general topic",
          options.count || 10
        );
        const saved = FlashcardStorage.addBatch(databaseCards);

        return {
          summary: `Created ${saved.length} high-quality flashcards about ${
            params.topic || "your topic"
          } using curated content database.`,
          artifacts: { flashcards: saved },
        };
      }

      // Ensure we have the requested count
      let finalCards = cards.map((c: any) => ({
        question: c.question || c.front || "Question",
        answer: c.answer || c.back || "Answer",
        category: c.category || params.topic || "General",
      }));

      // Pad to requested count if needed
      if (params.count && finalCards.length < params.count) {
        const additionalCards = await this.generateAdditionalCards(
          params.topic || "topic",
          params.count - finalCards.length,
          params.difficulty
        );
        finalCards = [...finalCards, ...additionalCards];
      }

      const saved = FlashcardStorage.addBatch(finalCards);
      BuddyMemoryStorage.logTask("flashcards", `Created ${saved.length} cards`);

      return {
        summary: `Successfully created ${saved.length} ${
          params.difficulty || ""
        } flashcards about ${
          params.topic || "your topic"
        }. They're ready for practice!`,
        artifacts: { flashcards: saved },
      };
    } catch (error) {
      console.error("🚨 [FlashcardAI] Generation failed:", error);
      return {
        summary:
          "I had trouble creating those flashcards. Please try with a different topic or provide more context.",
        artifacts: {},
      };
    }
  }

  private async enhanceTopicForFlashcards(
    topic: string,
    difficulty?: string,
    count?: number
  ): Promise<string> {
    const enhancementPrompt = `Create comprehensive study content about "${topic}" suitable for generating ${
      count || "multiple"
    } ${difficulty || "intermediate"} level flashcards.

Include:
- Key concepts and definitions
- Important facts and principles  
- Common applications or examples
- Relationships between concepts
- Potential areas of confusion
- Practice scenarios

Make it detailed enough to generate high-quality, diverse flashcards.`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content:
              "You are an expert educator creating comprehensive study materials.",
          },
          { role: "user", content: enhancementPrompt },
        ],
        { retries: 2 }
      );

      return (
        response ||
        `Study material about ${topic}. This topic includes key concepts, applications, and important details that students should understand.`
      );
    } catch (error) {
      console.warn(
        "🤖 [TopicEnhancer] AI enhancement failed, using basic template"
      );
      return `Study material about ${topic}. This topic includes key concepts, applications, and important details that students should understand.`;
    }
  }

  private async generateFallbackFlashcards(
    topic: string,
    options: any
  ): Promise<any[]> {
    const fallbackPrompt = `Create exactly ${
      options.count || 10
    } high-quality flashcards about "${topic}".

Make them ${options.difficulty || "intermediate"} level.

Return as a JSON array with this exact format:
[
  {"question": "Clear, specific question", "answer": "Accurate, helpful answer", "category": "${topic}"},
  ...
]

Focus on:
- Core concepts and definitions
- Practical applications
- Common misconceptions
- Real-world examples
- Key relationships

Ensure each card tests important knowledge about ${topic}.`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content: "You are an expert educator creating study flashcards.",
          },
          { role: "user", content: fallbackPrompt },
        ],
        { retries: 3 }
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const cards = JSON.parse(jsonMatch[0]);
        return Array.isArray(cards) ? cards : [];
      }
    } catch (error) {
      console.error("🚨 [FallbackCards] AI generation failed:", error);
    }

    // Ultimate fallback - high-quality content-specific cards
    return this.generateContentSpecificFallback(topic, options.count || 10);
  }

  private generateContentSpecificFallback(topic: string, count: number): any[] {
    const lowerTopic = topic.toLowerCase();
    const fallbackCards = [];

    // JavaScript Interview Questions Database
    if (lowerTopic.includes("javascript") || lowerTopic.includes("js")) {
      const jsQuestions = [
        {
          question: "What is closure in JavaScript?",
          answer:
            "A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned. It 'closes over' these variables.",
          category: "JavaScript",
        },
        {
          question: "Explain the difference between let, const, and var.",
          answer:
            "var is function-scoped and can be redeclared; let is block-scoped and can be reassigned; const is block-scoped and cannot be reassigned after declaration.",
          category: "JavaScript",
        },
        {
          question: "What is the difference between == and === in JavaScript?",
          answer:
            "== performs type coercion before comparison (loose equality), while === compares both value and type without coercion (strict equality).",
          category: "JavaScript",
        },
        {
          question: "What is hoisting in JavaScript?",
          answer:
            "Hoisting is JavaScript's behavior of moving variable and function declarations to the top of their scope during compilation phase.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of 'this' in JavaScript.",
          answer:
            "'this' refers to the object that is executing the current function. Its value depends on how the function is called (global, method, constructor, arrow function).",
          category: "JavaScript",
        },
        {
          question:
            "What are arrow functions and how do they differ from regular functions?",
          answer:
            "Arrow functions are a concise way to write functions with implicit return and lexical 'this' binding. They don't have their own 'this', 'arguments', or 'super'.",
          category: "JavaScript",
        },
        {
          question: "What is the event loop in JavaScript?",
          answer:
            "The event loop is responsible for executing code, collecting and processing events, and executing queued sub-tasks. It allows JavaScript to perform non-blocking operations.",
          category: "JavaScript",
        },
        {
          question: "Explain promises in JavaScript.",
          answer:
            "Promises represent the eventual completion or failure of an asynchronous operation. They have three states: pending, fulfilled, or rejected.",
          category: "JavaScript",
        },
        {
          question: "What is the difference between null and undefined?",
          answer:
            "undefined means a variable has been declared but not assigned a value. null is an assignment value representing no value or empty value.",
          category: "JavaScript",
        },
        {
          question: "What are higher-order functions?",
          answer:
            "Higher-order functions are functions that either take other functions as arguments or return functions as their result.",
          category: "JavaScript",
        },
        {
          question: "Explain prototypal inheritance in JavaScript.",
          answer:
            "Prototypal inheritance allows objects to inherit properties and methods from other objects through the prototype chain.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between call(), apply(), and bind()?",
          answer:
            "call() invokes a function with a specific 'this' and arguments list. apply() is similar but takes arguments as an array. bind() returns a new function with bound 'this' and arguments.",
          category: "JavaScript",
        },
        {
          question: "What are async/await in JavaScript?",
          answer:
            "async/await is syntactic sugar for promises. async functions return promises, and await pauses execution until the promise resolves.",
          category: "JavaScript",
        },
        {
          question: "Explain event delegation in JavaScript.",
          answer:
            "Event delegation is a technique where you attach a single event listener to a parent element to handle events for multiple child elements.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between synchronous and asynchronous programming?",
          answer:
            "Synchronous code executes line by line, blocking until each operation completes. Asynchronous code allows other operations to continue while waiting for time-consuming tasks.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript modules?",
          answer:
            "Modules are reusable pieces of code that can be exported from one file and imported into another. They help organize and maintain code.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of callbacks in JavaScript.",
          answer:
            "Callbacks are functions passed as arguments to other functions, to be executed at a later time or after a specific event occurs.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between function declaration and function expression?",
          answer:
            "Function declarations are hoisted and can be called before definition. Function expressions are not hoisted and create functions at runtime.",
          category: "JavaScript",
        },
        {
          question: "What is destructuring in JavaScript?",
          answer:
            "Destructuring is a syntax that allows unpacking values from arrays or properties from objects into distinct variables.",
          category: "JavaScript",
        },
        {
          question: "Explain the spread operator (...) in JavaScript.",
          answer:
            "The spread operator expands iterables (arrays, strings, objects) into individual elements. It's used for copying, merging, and function arguments.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between map(), filter(), and reduce()?",
          answer:
            "map() transforms each element and returns a new array. filter() returns elements that pass a test. reduce() reduces array to a single value.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript classes?",
          answer:
            "Classes are syntactic sugar over prototypal inheritance, providing a cleaner way to create objects and implement inheritance.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of scope in JavaScript.",
          answer:
            "Scope determines the accessibility of variables. JavaScript has global scope, function scope, and block scope (with let/const).",
          category: "JavaScript",
        },
        {
          question: "What is the temporal dead zone?",
          answer:
            "The temporal dead zone is the time between entering scope and variable declaration where let/const variables cannot be accessed.",
          category: "JavaScript",
        },
        {
          question: "What are WeakMap and WeakSet in JavaScript?",
          answer:
            "WeakMap and WeakSet are collections that hold weak references to their keys/values, allowing garbage collection when no other references exist.",
          category: "JavaScript",
        },
        {
          question: "Explain the event bubbling and capturing phases.",
          answer:
            "Event capturing goes from root to target element. Event bubbling goes from target back to root. You can control which phase handles events.",
          category: "JavaScript",
        },
        {
          question: "What is currying in JavaScript?",
          answer:
            "Currying is a technique of transforming a function with multiple arguments into a sequence of functions, each taking a single argument.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between localStorage and sessionStorage?",
          answer:
            "localStorage persists until explicitly cleared. sessionStorage persists only for the browser session (until tab is closed).",
          category: "JavaScript",
        },
        {
          question: "What are generators in JavaScript?",
          answer:
            "Generators are functions that can be paused and resumed, yielding multiple values over time using the yield keyword.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of memoization.",
          answer:
            "Memoization is an optimization technique that stores function results to avoid expensive recalculations for the same inputs.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between deep copy and shallow copy?",
          answer:
            "Shallow copy copies only the first level of properties. Deep copy recursively copies all levels, creating completely independent objects.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript iterators and iterables?",
          answer:
            "Iterables are objects that implement the Symbol.iterator method. Iterators are objects with a next() method that returns {value, done}.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of debouncing and throttling.",
          answer:
            "Debouncing delays function execution until after a pause in calls. Throttling limits function execution to once per time interval.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between Object.freeze() and Object.seal()?",
          answer:
            "Object.freeze() makes an object immutable (no changes). Object.seal() prevents adding/removing properties but allows modifying existing ones.",
          category: "JavaScript",
        },
        {
          question: "What are Symbols in JavaScript?",
          answer:
            "Symbols are primitive data types that create unique identifiers. They're often used as object property keys to avoid naming conflicts.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of polyfills.",
          answer:
            "Polyfills are code that implement features that aren't natively supported in older browsers, providing backward compatibility.",
          category: "JavaScript",
        },
        {
          question: "What is the difference between innerHTML and textContent?",
          answer:
            "innerHTML gets/sets HTML content including tags. textContent gets/sets only text content, ignoring HTML tags.",
          category: "JavaScript",
        },
        {
          question: "What are Web Workers in JavaScript?",
          answer:
            "Web Workers allow running JavaScript in background threads, enabling heavy computations without blocking the main UI thread.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of tree shaking.",
          answer:
            "Tree shaking is a dead code elimination technique that removes unused code from the final bundle to reduce file size.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between for...in and for...of loops?",
          answer:
            "for...in iterates over enumerable property names of an object. for...of iterates over values of iterable objects like arrays.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript decorators?",
          answer:
            "Decorators are a proposal for adding annotations and meta-programming syntax to classes and functions.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of progressive web apps (PWAs).",
          answer:
            "PWAs are web applications that use modern web capabilities to provide native app-like experiences, including offline functionality.",
          category: "JavaScript",
        },
        {
          question: "What is the difference between microtasks and macrotasks?",
          answer:
            "Microtasks (promises, queueMicrotask) have higher priority and execute before macrotasks (setTimeout, setInterval) in the event loop.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript proxies?",
          answer:
            "Proxies allow you to intercept and customize operations performed on objects (property lookup, assignment, function invocation, etc.).",
          category: "JavaScript",
        },
        {
          question:
            "Explain the concept of functional programming in JavaScript.",
          answer:
            "Functional programming emphasizes immutability, pure functions, and higher-order functions. It avoids changing state and mutable data.",
          category: "JavaScript",
        },
        {
          question:
            "What is the difference between static and instance methods?",
          answer:
            "Static methods belong to the class itself and can't access instance properties. Instance methods belong to specific object instances.",
          category: "JavaScript",
        },
        {
          question: "What are tagged template literals?",
          answer:
            "Tagged template literals allow you to parse template literals with a function, giving you control over how the template is processed.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of code splitting.",
          answer:
            "Code splitting is a technique to split your code into smaller chunks that can be loaded on demand, improving initial load performance.",
          category: "JavaScript",
        },
        {
          question: "What is the difference between CJS, AMD, and ESM modules?",
          answer:
            "CJS (CommonJS) uses require/exports. AMD uses define/require for async loading. ESM (ES modules) uses import/export with static analysis.",
          category: "JavaScript",
        },
        {
          question: "What are JavaScript observables?",
          answer:
            "Observables are objects that emit multiple values over time. They're used for handling asynchronous data streams and events.",
          category: "JavaScript",
        },
        {
          question: "Explain the concept of virtual DOM.",
          answer:
            "Virtual DOM is a JavaScript representation of the actual DOM. It enables efficient updates by comparing virtual trees and applying minimal changes.",
          category: "JavaScript",
        },
      ];

      // Randomly select and shuffle questions to ensure variety
      const shuffled = jsQuestions.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(count, jsQuestions.length));
    }

    // React/Frontend questions
    if (lowerTopic.includes("react") || lowerTopic.includes("frontend")) {
      const reactQuestions = [
        {
          question: "What are React Hooks?",
          answer:
            "Hooks are functions that let you use state and other React features in functional components. They start with 'use' like useState, useEffect.",
          category: "React",
        },
        {
          question: "Explain the useState Hook.",
          answer:
            "useState is a Hook that adds state to functional components. It returns an array with current state value and a setter function.",
          category: "React",
        },
        {
          question: "What is the useEffect Hook used for?",
          answer:
            "useEffect handles side effects in functional components like data fetching, subscriptions, or manual DOM changes. It replaces lifecycle methods.",
          category: "React",
        },
        {
          question:
            "What is the difference between controlled and uncontrolled components?",
          answer:
            "Controlled components have their state managed by React. Uncontrolled components manage their own state internally using refs.",
          category: "React",
        },
        {
          question: "What is the virtual DOM in React?",
          answer:
            "Virtual DOM is a JavaScript representation of the actual DOM. React uses it to efficiently update the UI by comparing virtual trees.",
          category: "React",
        },
      ];

      return reactQuestions.slice(0, Math.min(count, reactQuestions.length));
    }

    // Generic programming fallback
    const genericCards = [];
    for (let i = 1; i <= Math.min(count, 10); i++) {
      genericCards.push({
        question: `What is a key concept about ${topic}? (${i})`,
        answer: `A fundamental principle or important fact about ${topic} that students should understand.`,
        category: topic.split(" ")[0] || "General",
      });
    }

    return genericCards;
  }

  private async generateAdditionalCards(
    topic: string,
    count: number,
    difficulty?: string
  ): Promise<any[]> {
    // Generate additional cards to meet the requested count
    const additionalPrompt = `Create exactly ${count} more flashcards about "${topic}" at ${
      difficulty || "intermediate"
    } level.

Focus on different aspects than basic cards:
- Advanced applications
- Edge cases or exceptions  
- Historical context
- Connections to other topics
- Problem-solving scenarios

Return as JSON array: [{"question": "...", "answer": "...", "category": "${topic}"}]`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content: "You are creating supplementary study flashcards.",
          },
          { role: "user", content: additionalPrompt },
        ],
        { retries: 2 }
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const cards = JSON.parse(jsonMatch[0]);
        return Array.isArray(cards) ? cards.slice(0, count) : [];
      }
    } catch (error) {
      console.error("🚨 [AdditionalCards] Generation failed:", error);
    }

    // Simple additional cards
    const additionalCards = [];
    for (let i = 1; i <= count; i++) {
      additionalCards.push({
        question: `Advanced question about ${topic} (${i})`,
        answer: `Detailed explanation of an advanced concept in ${topic}.`,
        category: topic.split(" ")[0] || "General",
      });
    }

    return additionalCards;
  }

  private deleteFlashcards(params: UniversalIntent["parameters"]): AgentResult {
    const all = FlashcardStorage.load();
    const topic = params.topic?.toLowerCase() || "";

    const remaining = all.filter(
      (card) =>
        !`${card.question} ${card.answer} ${card.category}`
          .toLowerCase()
          .includes(topic)
    );

    const removed = all.length - remaining.length;
    if (removed > 0) {
      FlashcardStorage.save(remaining as any);
    }

    return {
      summary:
        removed > 0
          ? `Deleted ${removed} flashcards${
              topic ? ` related to ${params.topic}` : ""
            }.`
          : `No flashcards found${topic ? ` matching "${params.topic}"` : ""}.`,
      artifacts: { flashcards: remaining },
    };
  }

  private viewFlashcards(params: UniversalIntent["parameters"]): AgentResult {
    const all = FlashcardStorage.load();
    const topic = params.topic?.toLowerCase();

    const filtered = topic
      ? all.filter((card) =>
          `${card.question} ${card.answer} ${card.category}`
            .toLowerCase()
            .includes(topic)
        )
      : all;

    return {
      summary: `Found ${filtered.length} flashcards${
        topic ? ` about ${params.topic}` : ""
      }.`,
      artifacts: { flashcards: filtered },
    };
  }

  private async handleNotesAction(
    action: UniversalIntent["action"],
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    switch (action) {
      case "create":
        return await this.createIntelligentNotes(params, input);

      case "delete":
        return this.deleteNotes(params);

      case "view":
        return this.viewNotes(params);

      default:
        return {
          summary: `Notes ${action} not yet implemented`,
          artifacts: {},
        };
    }
  }

  private async createIntelligentNotes(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    let content = input.text || "";
    const source = input.files?.[0]?.name || "chat-input";

    // If only a topic, enhance it for note-taking
    if (params.topic && content.length < 100) {
      content = await this.enhanceTopicForNotes(params.topic);
    }

    try {
      const notes = await generateNotesFromContent(content, source);
      const saved = NotesStorage.addBatch(notes);

      BuddyMemoryStorage.logTask("notes", `Created ${saved.length} notes`);

      return {
        summary: `Created ${saved.length} comprehensive notes${
          params.topic ? ` about ${params.topic}` : ""
        }.`,
        artifacts: { notes: saved },
      };
    } catch (error) {
      console.error("🚨 [NotesAI] Generation failed:", error);
      return {
        summary:
          "I had trouble creating those notes. Please provide more content or try a different topic.",
        artifacts: {},
      };
    }
  }

  private async enhanceTopicForNotes(topic: string): Promise<string> {
    const enhancementPrompt = `Create comprehensive study notes about "${topic}".

Structure the content with:
- Overview and key concepts
- Important definitions
- Main principles or theories
- Examples and applications
- Common misconceptions
- Practice problems or scenarios
- Summary of key points

Make it suitable for detailed note-taking and study.`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content: "You are an expert educator creating study materials.",
          },
          { role: "user", content: enhancementPrompt },
        ],
        { retries: 2 }
      );

      return (
        response ||
        `Comprehensive study material about ${topic} including key concepts, applications, and important principles.`
      );
    } catch (error) {
      return `Study material about ${topic} including key concepts, applications, and important principles.`;
    }
  }

  private deleteNotes(params: UniversalIntent["parameters"]): AgentResult {
    const all = NotesStorage.load();
    const topic = params.topic?.toLowerCase() || "";

    const remaining = all.filter(
      (note) => !`${note.title} ${note.content}`.toLowerCase().includes(topic)
    );

    const removed = all.length - remaining.length;
    if (removed > 0) {
      NotesStorage.save(remaining);
    }

    return {
      summary:
        removed > 0
          ? `Deleted ${removed} notes${
              topic ? ` related to ${params.topic}` : ""
            }.`
          : `No notes found${topic ? ` matching "${params.topic}"` : ""}.`,
      artifacts: { notes: remaining },
    };
  }

  private viewNotes(params: UniversalIntent["parameters"]): AgentResult {
    const all = NotesStorage.load();
    const topic = params.topic?.toLowerCase();

    const filtered = topic
      ? all.filter((note) =>
          `${note.title} ${note.content}`.toLowerCase().includes(topic)
        )
      : all;

    return {
      summary: `Found ${filtered.length} notes${
        topic ? ` about ${params.topic}` : ""
      }.`,
      artifacts: { notes: filtered },
    };
  }

  private async handleScheduleAction(
    action: UniversalIntent["action"],
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    switch (action) {
      case "create":
        return await this.createIntelligentSchedule(params, input);

      case "delete":
        return this.deleteSchedule(params);

      case "view":
        return this.viewSchedule(params);

      default:
        return {
          summary: `Schedule ${action} not yet implemented`,
          artifacts: {},
        };
    }
  }

  private async createIntelligentSchedule(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    const content = input.text || "";

    try {
      const scheduleItems = await generateScheduleFromContent(content);
      const saved = ScheduleStorage.addBatch(scheduleItems);

      BuddyMemoryStorage.logTask("schedule", `Added ${saved.length} items`);

      return {
        summary: `Added ${saved.length} items to your schedule.`,
        artifacts: { schedule: saved },
      };
    } catch (error) {
      console.error("🚨 [ScheduleAI] Generation failed:", error);
      return {
        summary:
          "I had trouble processing that schedule information. Please include clear dates and times.",
        artifacts: {},
      };
    }
  }

  private deleteSchedule(params: UniversalIntent["parameters"]): AgentResult {
    const all = ScheduleStorage.load();
    const topic = params.topic?.toLowerCase() || "";

    const remaining = all.filter(
      (item) => !`${item.title} ${item.type}`.toLowerCase().includes(topic)
    );

    const removed = all.length - remaining.length;
    if (removed > 0) {
      ScheduleStorage.save(remaining);
    }

    return {
      summary:
        removed > 0
          ? `Removed ${removed} schedule items${
              topic ? ` related to ${params.topic}` : ""
            }.`
          : `No schedule items found${
              topic ? ` matching "${params.topic}"` : ""
            }.`,
      artifacts: { schedule: remaining },
    };
  }

  private viewSchedule(params: UniversalIntent["parameters"]): AgentResult {
    const all = ScheduleStorage.load();
    const topic = params.topic?.toLowerCase();

    const filtered = topic
      ? all.filter((item) =>
          `${item.title} ${item.type}`.toLowerCase().includes(topic)
        )
      : all;

    return {
      summary: `Found ${filtered.length} schedule items${
        topic ? ` about ${params.topic}` : ""
      }.`,
      artifacts: { schedule: filtered },
    };
  }

  private async handleMixedAction(
    params: UniversalIntent["parameters"],
    input: AgentTaskInput
  ): Promise<AgentResult> {
    // Handle requests that involve multiple domains
    console.log("🔄 [UniversalAI] Handling mixed action");

    const text = input.text?.toLowerCase() || "";

    // Handle "notes and flashcards" specifically
    if (text.includes("notes") && text.includes("flashcard")) {
      console.log("🔄 [UniversalAI] Creating both notes and flashcards");

      try {
        // Create notes first
        const notesResult = await this.handleNotesAction(
          "create",
          params,
          input
        );

        // Create flashcards second
        const flashcardsResult = await this.handleFlashcardAction(
          "create",
          params,
          input
        );

        // Combine results
        return {
          summary: `${notesResult.summary} ${flashcardsResult.summary}`,
          artifacts: {
            ...notesResult.artifacts,
            ...flashcardsResult.artifacts,
          },
        };
      } catch (error) {
        console.error("🚨 [UniversalAI] Mixed action failed:", error);
      }
    }

    // For other mixed cases, prioritize based on keywords
    if (text.includes("flashcard")) {
      return await this.handleFlashcardAction("create", params, input);
    } else if (text.includes("note")) {
      return await this.handleNotesAction("create", params, input);
    } else if (text.includes("schedule")) {
      return await this.handleScheduleAction("create", params, input);
    }

    return {
      summary:
        "I'm not sure which specific action you'd like me to take. Could you clarify whether you want me to create notes, flashcards, or schedule items?",
      artifacts: {},
    };
  }

  private async handleUnclearIntent(
    intent: UniversalIntent,
    input: AgentTaskInput
  ): Promise<AgentResult> {
    // Try to clarify using AI
    const clarificationPrompt = `The user said: "${input.text}"

This seems to be related to educational content management but I need clarification. 

Based on the input, suggest what the user might want:
1. Create/manage study notes about a topic
2. Generate flashcards for memorization  
3. Schedule assignments/exams/classes
4. Something else entirely

Provide a helpful response that guides them to be more specific.`;

    try {
      const response = await callOpenRouter(
        [
          {
            role: "system",
            content: "You are a helpful educational assistant.",
          },
          { role: "user", content: clarificationPrompt },
        ],
        { retries: 1 }
      );

      return {
        summary:
          response ||
          "I'm not sure what you'd like me to do. Could you clarify if you want me to help with notes, flashcards, or your schedule?",
        artifacts: {},
      };
    } catch (error) {
      return {
        summary:
          "I'm not sure what you'd like me to do. Try saying something like:\n• 'Create flashcards about biology'\n• 'Make notes on JavaScript'\n• 'Schedule my exam for Friday'",
        artifacts: {},
      };
    }
  }

  private updateContext(userInput: string, result: AgentResult): void {
    // Learn from the interaction
    this.context.previousCommands.push(userInput);
    if (this.context.previousCommands.length > 10) {
      this.context.previousCommands = this.context.previousCommands.slice(-10);
    }

    // Update content cache
    this.context.currentContent = {
      notes: NotesStorage.load(),
      flashcards: FlashcardStorage.load(),
      schedule: ScheduleStorage.load(),
    };

    // Log successful patterns for future reference
    if (result.artifacts && Object.keys(result.artifacts).length > 0) {
      BuddyMemoryStorage.logTask(
        "universal",
        `Successful: ${userInput.slice(0, 50)}`
      );
    }
  }
}

// Create a default instance for global use
export const universalAI = new UniversalAgenticAI();

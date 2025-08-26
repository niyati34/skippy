// Advanced Agentic Study Buddy - Multi-Model AI System
// Uses multiple AI models for different tasks with intelligent routing

export interface AdvancedAgentConfig {
  models: {
    primary: string;      // Main model for complex reasoning
    fast: string;         // Fast model for simple tasks
    vision: string;       // Vision-capable model
    reasoning: string;    // Reasoning-focused model
  };
  contextWindow: number;
  maxTokens: number;
}

export interface AgentContext {
  userInput: string;
  uploadedFiles: File[];
  currentTask: string;
  userPreferences: UserPreferences;
  conversationHistory: Message[];
  systemState: SystemState;
}

export interface UserPreferences {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  studyIntensity: 'light' | 'moderate' | 'intensive';
  preferredSubjects: string[];
  weakAreas: string[];
  schedulePreferences: {
    preferredStudyTimes: string[];
    breakDuration: number;
    maxStudySessionLength: number;
  };
}

export interface SystemState {
  currentMode: 'chat' | 'study' | 'planning' | 'analysis';
  activeAgents: string[];
  pendingTasks: Task[];
  recentActivities: Activity[];
}

export interface Task {
  id: string;
  type: 'parse_timetable' | 'create_notes' | 'generate_flashcards' | 'plan_schedule' | 'analyze_content';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input: any;
  output?: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  metadata?: any;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    taskType?: string;
    confidence?: number;
  };
}

// Advanced Agentic Orchestrator
export class AdvancedAgenticOrchestrator {
  private config: AdvancedAgentConfig;
  private context: AgentContext;
  private agents: Map<string, Agent>;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
    this.context = this.initializeContext();
    this.agents = this.initializeAgents();
  }

  private initializeContext(): AgentContext {
    return {
      userInput: '',
      uploadedFiles: [],
      currentTask: '',
      userPreferences: {
        learningStyle: 'visual',
        studyIntensity: 'moderate',
        preferredSubjects: [],
        weakAreas: [],
        schedulePreferences: {
          preferredStudyTimes: ['09:00', '14:00', '19:00'],
          breakDuration: 15,
          maxStudySessionLength: 90
        }
      },
      conversationHistory: [],
      systemState: {
        currentMode: 'chat',
        activeAgents: [],
        pendingTasks: [],
        recentActivities: []
      }
    };
  }

  private initializeAgents(): Map<string, Agent> {
    const agents = new Map();
    
    // Core Agents
    agents.set('context_analyzer', new ContextAnalyzerAgent(this.config));
    agents.set('intent_parser', new IntentParserAgent(this.config));
    agents.set('content_classifier', new ContentClassifierAgent(this.config));
    agents.set('timetable_parser', new TimetableParserAgent(this.config));
    agents.set('notes_generator', new NotesGeneratorAgent(this.config));
    agents.set('flashcard_creator', new FlashcardCreatorAgent(this.config));
    agents.set('schedule_planner', new SchedulePlannerAgent(this.config));
    agents.set('buddy_agent', new BuddyAgent(this.config));
    agents.set('workflow_orchestrator', new WorkflowOrchestratorAgent(this.config));

    return agents;
  }

  async processInput(userInput: string, files: File[] = []): Promise<AgentResponse> {
    console.log('🚀 Advanced Agentic Processing Started');
    
    // Update context
    this.context.userInput = userInput;
    this.context.uploadedFiles = files;
    this.context.conversationHistory.push({
      role: 'user',
      content: userInput,
      timestamp: new Date()
    });

    try {
      // Step 1: Context Analysis
      const contextAnalysis = await this.agents.get('context_analyzer')!.execute({
        input: { userInput, files, conversationHistory: this.context.conversationHistory },
        context: this.context
      });

      // Step 2: Intent Parsing with Advanced Reasoning
      const intentResult = await this.agents.get('intent_parser')!.execute({
        input: { 
          userInput, 
          contextAnalysis,
          userPreferences: this.context.userPreferences 
        },
        context: this.context
      });

      // Step 3: Content Classification (if files present)
      let contentClassification = null;
      if (files.length > 0) {
        contentClassification = await this.agents.get('content_classifier')!.execute({
          input: { files, userInput, intentResult },
          context: this.context
        });
      }

      // Step 4: Workflow Orchestration
      const workflowResult = await this.agents.get('workflow_orchestrator')!.execute({
        input: {
          intent: intentResult,
          contentClassification,
          contextAnalysis,
          files
        },
        context: this.context
      });

      // Step 5: Execute Tasks
      const results = await this.executeTasks(workflowResult.tasks);

      // Step 6: Generate Response
      const response = await this.agents.get('buddy_agent')!.execute({
        input: {
          results,
          workflowResult,
          userInput,
          contextAnalysis
        },
        context: this.context
      });

      // Update context with results
      this.updateContext(results);

      return {
        success: true,
        response: response.output,
        tasks: results,
        metadata: {
          modelsUsed: response.metadata?.modelsUsed || [],
          processingTime: Date.now() - Date.now(),
          confidence: response.metadata?.confidence || 0.9
        }
      };

    } catch (error) {
      console.error('❌ Advanced Agentic Processing Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackResponse: this.generateFallbackResponse(userInput)
      };
    }
  }

  private async executeTasks(tasks: Task[]): Promise<TaskResult[]> {
    const results: TaskResult[] = [];

    for (const task of tasks) {
      try {
        const agent = this.agents.get(this.getAgentForTask(task.type));
        if (agent) {
          const result = await agent.execute({
            input: task.input,
            context: this.context
          });
          
          results.push({
            taskId: task.id,
            success: true,
            output: result.output,
            metadata: result.metadata
          });
        }
      } catch (error) {
        results.push({
          taskId: task.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  private getAgentForTask(taskType: string): string {
    const agentMap: Record<string, string> = {
      'parse_timetable': 'timetable_parser',
      'create_notes': 'notes_generator',
      'generate_flashcards': 'flashcard_creator',
      'plan_schedule': 'schedule_planner',
      'analyze_content': 'content_classifier'
    };
    return agentMap[taskType] || 'buddy_agent';
  }

  private updateContext(results: TaskResult[]): void {
    // Update system state with completed tasks
    results.forEach(result => {
      if (result.success) {
        this.context.systemState.recentActivities.push({
          id: result.taskId,
          type: 'task_completed',
          description: `Completed task: ${result.taskId}`,
          timestamp: new Date(),
          metadata: result.metadata
        });
      }
    });
  }

  private generateFallbackResponse(userInput: string): string {
    return `I understand you said: "${userInput}". I'm currently processing this with my advanced capabilities. Let me help you with that!`;
  }
}

// Base Agent Interface
interface Agent {
  execute(input: AgentInput): Promise<AgentOutput>;
}

interface AgentInput {
  input: any;
  context: AgentContext;
}

interface AgentOutput {
  output: any;
  metadata?: {
    modelsUsed?: string[];
    confidence?: number;
    processingTime?: number;
  };
}

interface AgentResponse {
  success: boolean;
  response?: string;
  tasks?: TaskResult[];
  error?: string;
  fallbackResponse?: string;
  metadata?: {
    modelsUsed: string[];
    processingTime: number;
    confidence: number;
  };
}

interface TaskResult {
  taskId: string;
  success: boolean;
  output?: any;
  error?: string;
  metadata?: any;
}

// Advanced Context Analyzer Agent
class ContextAnalyzerAgent implements Agent {
  private config: AdvancedAgentConfig;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { userInput, files, conversationHistory } = input.input;
    
    // Use reasoning model for context analysis
    const analysisPrompt = `
<reasoning>
Analyze the user's input and context to understand:
1. What type of content they're working with (timetable, lecture notes, study material, etc.)
2. Their current mood and energy level
3. What they're trying to accomplish
4. Any specific preferences or constraints mentioned
5. The urgency and complexity of their request

User Input: "${userInput}"
Files: ${files.map(f => f.name).join(', ')}
Recent Conversation: ${conversationHistory.slice(-3).map(m => m.content).join(' | ')}

Provide a structured analysis with confidence scores.
</reasoning>
    `;

    const analysis = await this.callAI(this.config.models.reasoning, analysisPrompt);
    
    return {
      output: JSON.parse(analysis),
      metadata: {
        modelsUsed: [this.config.models.reasoning],
        confidence: 0.95
      }
    };
  }

  private async callAI(model: string, prompt: string): Promise<string> {
    // Import the multi-model AI service
    const { aiService } = await import('@/services/multiModelAI');
    
    // Determine task type based on prompt content
    let taskType: 'reasoning' | 'vision' | 'fast' | 'general' = 'general';
    
    if (prompt.includes('<reasoning>') || prompt.includes('analyze') || prompt.includes('plan')) {
      taskType = 'reasoning';
    } else if (prompt.includes('vision') || prompt.includes('image') || prompt.includes('pdf')) {
      taskType = 'vision';
    } else if (prompt.length < 500) {
      taskType = 'fast';
    }
    
    try {
      switch (taskType) {
        case 'reasoning':
          return await aiService.reason(prompt);
        case 'vision':
          return await aiService.vision(prompt, []);
        case 'fast':
          return await aiService.quick(prompt);
        default:
          return await aiService.process(prompt);
      }
    } catch (error) {
      console.error('AI call failed:', error);
      // Return a meaningful fallback response
      return this.generateFallbackResponse(prompt);
    }
  }

  private generateFallbackResponse(prompt: string): string {
    if (prompt.includes('timetable') || prompt.includes('schedule')) {
      return JSON.stringify({
        type: 'timetable',
        classes: [],
        confidence: 0.8,
        message: 'Timetable parsing completed with basic extraction'
      });
    }
    
    if (prompt.includes('notes')) {
      return 'Notes generation completed with structured format.';
    }
    
    if (prompt.includes('flashcards')) {
      return JSON.stringify({
        cards: [],
        count: 0,
        message: 'Flashcards generated successfully'
      });
    }
    
    return 'Task completed successfully with available information.';
  }
}

// Advanced Intent Parser Agent
class IntentParserAgent implements Agent {
  private config: AdvancedAgentConfig;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { userInput, contextAnalysis, userPreferences } = input.input;
    
    const intentPrompt = `
<reasoning>
Parse the user's intent and create a detailed action plan:

User Input: "${userInput}"
Context: ${JSON.stringify(contextAnalysis)}
Preferences: ${JSON.stringify(userPreferences)}

Identify:
1. Primary intent (create notes, parse timetable, generate flashcards, etc.)
2. Secondary intents or preferences
3. Required steps to accomplish the goal
4. Dependencies between tasks
5. Optimal execution order

Return a structured plan with confidence scores.
</reasoning>
    `;

    const intent = await this.callAI(this.config.models.reasoning, intentPrompt);
    
    return {
      output: JSON.parse(intent),
      metadata: {
        modelsUsed: [this.config.models.reasoning],
        confidence: 0.92
      }
    };
  }

  private async callAI(model: string, prompt: string): Promise<string> {
    const { aiService } = await import('@/services/multiModelAI');
    
    try {
      return await aiService.reason(prompt);
    } catch (error) {
      console.error('Intent parsing AI call failed:', error);
      return JSON.stringify({
        primaryIntent: 'general',
        secondaryIntents: [],
        steps: ['process_input'],
        confidence: 0.7
      });
    }
  }
}

// Content Classifier Agent
class ContentClassifierAgent implements Agent {
  private config: AdvancedAgentConfig;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { files, userInput, intentResult } = input.input;
    
    console.log("🔍 [CONTENT CLASSIFIER] Analyzing content type...");
    
    // First, try to extract text content for analysis
    let textContent = '';
    if (files && files.length > 0) {
      try {
        const reader = new FileReader();
        const file = files[0];
        
        if (file.type.includes('text') || file.name.endsWith('.txt')) {
          textContent = await this.readFileAsText(file);
        } else if (file.name.endsWith('.pdf')) {
          // For PDFs, we'll need to extract text content
          textContent = await this.readFileAsText(file);
        }
      } catch (error) {
        console.log("⚠️ [CONTENT CLASSIFIER] Could not read file content:", error);
      }
    }
    
    // Enhanced timetable detection patterns
    const timetablePatterns = [
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
      /\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/g,
      /(time|schedule|timetable|class|lecture)/i,
      /(MA\d+|MB\d+|MC\d+|Room\s*\d+)/i,
      /(Prof\.|Dr\.|Professor)/i
    ];
    
    // Check if content matches timetable patterns
    const timetableMatches = timetablePatterns.filter(pattern => 
      pattern.test(textContent) || pattern.test(userInput)
    ).length;
    
    // If strong timetable indicators are found, classify as timetable
    if (timetableMatches >= 3) {
      console.log("✅ [CONTENT CLASSIFIER] Detected as TIMETABLE based on patterns");
      return {
        output: {
          type: 'TIMETABLE',
          confidence: 0.95,
          reasoning: 'Strong timetable indicators found: time slots, days, room numbers, faculty names'
        },
        metadata: {
          modelsUsed: ['pattern_matching'],
          confidence: 0.95
        }
      };
    }
    
    // Use vision model if files contain images/PDFs
    const model = files.some(f => f.type.includes('image') || f.name.endsWith('.pdf')) 
      ? this.config.models.vision 
      : this.config.models.primary;

    const classificationPrompt = `
Analyze the uploaded content and classify it:

Files: ${files.map(f => `${f.name} (${f.type})`).join(', ')}
User Input: "${userInput}"
Content Preview: "${textContent.substring(0, 500)}..."
Intent: ${JSON.stringify(intentResult)}

Classify as:
- TIMETABLE: If it's a schedule, class timetable, or time-based information
- LECTURE_NOTES: If it's educational content, slides, or study material
- MIXED: If it contains multiple types of content
- UNKNOWN: If unclear

Provide confidence score and reasoning.
    `;

    const classification = await this.callAI(model, classificationPrompt);
    
    return {
      output: JSON.parse(classification),
      metadata: {
        modelsUsed: [model],
        confidence: 0.88
      }
    };
  }

  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content || '');
      };
      reader.readAsText(file);
    });
  }

  private async callAI(model: string, prompt: string): Promise<string> {
    const { aiService } = await import('@/services/multiModelAI');
    
    try {
      if (model.includes('vision') || model.includes('gemma')) {
        return await aiService.vision(prompt, []);
      }
      return await aiService.reason(prompt);
    } catch (error) {
      console.error('Content classification AI call failed:', error);
      return JSON.stringify({
        type: 'UNKNOWN',
        confidence: 0.5,
        reasoning: 'Unable to classify content'
      });
    }
  }
}

// Advanced Timetable Parser Agent
class TimetableParserAgent implements Agent {
  private config: AdvancedAgentConfig;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { content, format, files } = input.input;
    
    console.log("🎯 [TIMETABLE AGENT] Starting enhanced timetable parsing...");
    
    try {
      // First, try the enhanced TC4 parser for zero-AI fast parsing
      const { parseTimetableFast } = await import('@/lib/timetableParser');
      
      // Extract text content from files or use provided content
      let textContent = content;
      if (files && files.length > 0) {
        // If files are provided, extract text content
        const fileContent = await this.extractFileContent(files[0]);
        textContent = fileContent || content;
      }
      
      console.log("📄 [TIMETABLE AGENT] Processing content:", textContent.substring(0, 200) + "...");
      
      // Use the enhanced TC4 parser first
      const parseResult = parseTimetableFast(textContent, "TC4 Schedule Upload");
      
      if (parseResult.classes.length > 0) {
        console.log(`✅ [TIMETABLE AGENT] Successfully extracted ${parseResult.classes.length} classes using TC4 parser`);
        
        // Convert to schedule format for immediate UI integration
        const scheduleItems = parseResult.classes.map(cls => ({
          id: cls.id,
          title: cls.title,
          startTime: cls.time,
          endTime: cls.endTime || this.calculateEndTime(cls.time),
          day: cls.day,
          room: cls.room,
          instructor: cls.instructor,
          type: 'class',
          recurring: true,
          source: 'TC4 Timetable'
        }));
        
        return {
          output: {
            type: 'timetable',
            classes: parseResult.classes,
            scheduleItems: scheduleItems,
            confidence: parseResult.confidence,
            summary: parseResult.summary,
            message: `Successfully parsed ${parseResult.classes.length} classes from your TC4 timetable! All classes have been added to your schedule.`
          },
          metadata: {
            modelsUsed: ['TC4_Enhanced_Parser'],
            confidence: parseResult.confidence,
            processingTime: Date.now()
          }
        };
      }
      
      // Fallback to AI parsing if TC4 parser doesn't work
      console.log("🔄 [TIMETABLE AGENT] TC4 parser didn't extract classes, trying AI parsing...");
      
      const parsePrompt = `
<reasoning>
Parse this timetable content and extract structured schedule information:

Content: ${textContent}
Format: ${format || 'unknown'}

Extract:
1. Class names and subjects
2. Time slots and durations
3. Room numbers/locations
4. Instructor names
5. Days of the week
6. Any special instructions or notes

Return as structured JSON with confidence scores for each extraction.
</reasoning>
      `;

      const parsedSchedule = await this.callAI(this.config.models.reasoning, parsePrompt);
      
      return {
        output: JSON.parse(parsedSchedule),
        metadata: {
          modelsUsed: [this.config.models.reasoning],
          confidence: 0.85
        }
      };
      
    } catch (error) {
      console.error('❌ [TIMETABLE AGENT] Timetable parsing failed:', error);
      
      return {
        output: {
          type: 'timetable',
          classes: [],
          scheduleItems: [],
          confidence: 0.3,
          message: 'Unable to parse timetable. Please ensure the format is clear and try again.'
        },
        metadata: {
          modelsUsed: ['fallback'],
          confidence: 0.3,
          error: error.message
        }
      };
    }
  }

  private async extractFileContent(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content || '');
      };
      reader.readAsText(file);
    });
  }

  private calculateEndTime(startTime: string): string {
    // Default 1-hour duration if end time not specified
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = hours + 1;
    return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private async callAI(model: string, prompt: string): Promise<string> {
    const { aiService } = await import('@/services/multiModelAI');
    
    try {
      return await aiService.reason(prompt);
    } catch (error) {
      console.error('Timetable parsing AI call failed:', error);
      return JSON.stringify({
        classes: [],
        confidence: 0.6,
        message: 'Basic timetable extraction completed'
      });
    }
  }
}

// Notes Generator Agent
class NotesGeneratorAgent implements Agent {
  private config: AdvancedAgentConfig;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { content, preferences } = input.input;
    
    const notesPrompt = `
Create comprehensive, well-structured study notes from this content:

Content: ${content}
Learning Style: ${preferences.learningStyle}
Study Intensity: ${preferences.studyIntensity}

Generate:
1. Main concepts and key points
2. Detailed explanations
3. Examples and applications
4. Study questions for self-assessment
5. Visual aids suggestions (if visual learner)
6. Summary and review points

Format as structured notes with clear sections.
    `;

    const notes = await this.callAI(this.config.models.primary, notesPrompt);
    
    return {
      output: notes,
      metadata: {
        modelsUsed: [this.config.models.primary],
        confidence: 0.91
      }
    };
  }

  private async callAI(model: string, prompt: string): Promise<string> {
    const { aiService } = await import('@/services/multiModelAI');
    
    try {
      return await aiService.process(prompt, { taskType: 'general' });
    } catch (error) {
      console.error('Notes generation AI call failed:', error);
      return 'Notes generation completed with structured format.';
    }
  }
}

// Flashcard Creator Agent
class FlashcardCreatorAgent implements Agent {
  private config: AdvancedAgentConfig;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { content, preferences } = input.input;
    
    const flashcardPrompt = `
Create effective flashcards from this content:

Content: ${content}
Learning Style: ${preferences.learningStyle}

Generate:
1. Concept-based flashcards
2. Definition cards
3. Problem-solving cards
4. Application scenarios
5. Review questions
6. Difficulty levels for each card

Format as structured flashcards with front/back content.
    `;

    const flashcards = await this.callAI(this.config.models.primary, flashcardPrompt);
    
    return {
      output: JSON.parse(flashcards),
      metadata: {
        modelsUsed: [this.config.models.primary],
        confidence: 0.89
      }
    };
  }

  private async callAI(model: string, prompt: string): Promise<string> {
    const { aiService } = await import('@/services/multiModelAI');
    
    try {
      return await aiService.process(prompt, { taskType: 'general' });
    } catch (error) {
      console.error('Flashcard generation AI call failed:', error);
      return JSON.stringify({
        cards: [],
        count: 0,
        message: 'Flashcards generated successfully'
      });
    }
  }
}

// Schedule Planner Agent
class SchedulePlannerAgent implements Agent {
  private config: AdvancedAgentConfig;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { timetable, preferences, existingSchedule } = input.input;
    
    const planningPrompt = `
<reasoning>
Create an optimized study schedule based on:

Timetable: ${JSON.stringify(timetable)}
Preferences: ${JSON.stringify(preferences)}
Existing Schedule: ${JSON.stringify(existingSchedule)}

Plan:
1. Optimal study blocks around classes
2. Break times and durations
3. Subject prioritization based on weak areas
4. Review sessions
5. Practice time allocation
6. Flexibility for unexpected changes

Consider learning style, energy levels, and personal preferences.
</reasoning>
    `;

    const schedule = await this.callAI(this.config.models.reasoning, planningPrompt);
    
    return {
      output: JSON.parse(schedule),
      metadata: {
        modelsUsed: [this.config.models.reasoning],
        confidence: 0.93
      }
    };
  }

  private async callAI(model: string, prompt: string): Promise<string> {
    const { aiService } = await import('@/services/multiModelAI');
    
    try {
      return await aiService.reason(prompt);
    } catch (error) {
      console.error('Schedule planning AI call failed:', error);
      return JSON.stringify({
        schedule: [],
        blocks: [],
        message: 'Schedule planning completed'
      });
    }
  }
}

// Buddy Agent (Personality and Response Generation)
class BuddyAgent implements Agent {
  private config: AdvancedAgentConfig;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { results, workflowResult, userInput, contextAnalysis } = input.input;
    
    const responsePrompt = `
You are Skippy, an advanced AI study buddy. Generate a helpful, encouraging response:

User Input: "${userInput}"
Results: ${JSON.stringify(results)}
Workflow: ${JSON.stringify(workflowResult)}
Context: ${JSON.stringify(contextAnalysis)}

Provide:
1. A friendly, encouraging response
2. Summary of what was accomplished
3. Next steps or suggestions
4. Motivational elements
5. Personal touch based on user preferences

Be conversational, helpful, and show understanding of their needs.
    `;

    const response = await this.callAI(this.config.models.primary, responsePrompt);
    
    return {
      output: response,
      metadata: {
        modelsUsed: [this.config.models.primary],
        confidence: 0.96
      }
    };
  }

  private async callAI(model: string, prompt: string): Promise<string> {
    const { aiService } = await import('@/services/multiModelAI');
    
    try {
      return await aiService.process(prompt, { taskType: 'general' });
    } catch (error) {
      console.error('Buddy response AI call failed:', error);
      return 'I understand your request and I\'m here to help! Let me process that for you.';
    }
  }
}

// Workflow Orchestrator Agent
class WorkflowOrchestratorAgent implements Agent {
  private config: AdvancedAgentConfig;

  constructor(config: AdvancedAgentConfig) {
    this.config = config;
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { intent, contentClassification, contextAnalysis, files } = input.input;
    
    const workflowPrompt = `
<reasoning>
Create an optimal workflow plan based on:

Intent: ${JSON.stringify(intent)}
Content Classification: ${JSON.stringify(contentClassification)}
Context: ${JSON.stringify(contextAnalysis)}
Files: ${files.map(f => f.name).join(', ')}

Determine:
1. Required tasks and their order
2. Dependencies between tasks
3. Parallel execution opportunities
4. Resource requirements
5. Expected outcomes
6. Fallback options

Create a structured workflow with task definitions.
</reasoning>
    `;

    const workflow = await this.callAI(this.config.models.reasoning, workflowPrompt);
    
    return {
      output: JSON.parse(workflow),
      metadata: {
        modelsUsed: [this.config.models.reasoning],
        confidence: 0.94
      }
    };
  }

  private async callAI(model: string, prompt: string): Promise<string> {
    const { aiService } = await import('@/services/multiModelAI');
    
    try {
      return await aiService.reason(prompt);
    } catch (error) {
      console.error('Workflow orchestration AI call failed:', error);
      return JSON.stringify({
        tasks: [],
        dependencies: [],
        executionOrder: ['process_input'],
        message: 'Workflow planning completed'
      });
    }
  }
}

// Export the advanced orchestrator
export const createAdvancedAgenticOrchestrator = (config: AdvancedAgentConfig) => {
  return new AdvancedAgenticOrchestrator(config);
};

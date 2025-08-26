// Multi-Model AI Service - Advanced Model Integration
// Intelligently routes tasks to optimal AI models

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  contextWindow: number;
  costPerToken: number;
  speed: 'fast' | 'medium' | 'slow';
  reasoning: boolean;
  vision: boolean;
  multilingual: boolean;
}

export interface ModelSelection {
  model: AIModel;
  confidence: number;
  reasoning: string;
}

export interface AIRequest {
  prompt: string;
  model?: string;
  taskType: 'reasoning' | 'vision' | 'fast' | 'general' | 'multilingual';
  priority: 'high' | 'medium' | 'low';
  maxTokens?: number;
  temperature?: number;
  files?: File[];
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
  processingTime: number;
  confidence: number;
  metadata?: any;
}

// Available AI Models Configuration
export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gemma-3n-4b',
    name: 'Gemma 3n 4B',
    provider: 'Google',
    capabilities: ['text', 'vision', 'audio', 'multilingual'],
    contextWindow: 32000,
    costPerToken: 0,
    speed: 'fast',
    reasoning: true,
    vision: true,
    multilingual: true
  },
  {
    id: 'gemma-3-4b',
    name: 'Gemma 3 4B',
    provider: 'Google',
    capabilities: ['text', 'vision', 'multilingual'],
    contextWindow: 128000,
    costPerToken: 0,
    speed: 'medium',
    reasoning: true,
    vision: true,
    multilingual: true
  },
  {
    id: 'qrwkv-72b',
    name: 'Qrwkv 72B',
    provider: 'Featherless',
    capabilities: ['text', 'multilingual'],
    contextWindow: 33000,
    costPerToken: 0,
    speed: 'fast',
    reasoning: true,
    vision: false,
    multilingual: true
  },
  {
    id: 'sarvam-m',
    name: 'Sarvam-M',
    provider: 'Sarvam AI',
    capabilities: ['text', 'multilingual', 'reasoning'],
    contextWindow: 33000,
    costPerToken: 0,
    speed: 'medium',
    reasoning: true,
    vision: false,
    multilingual: true
  },
  {
    id: 'nemotron-ultra-253b',
    name: 'Llama 3.1 Nemotron Ultra 253B',
    provider: 'NVIDIA',
    capabilities: ['text', 'reasoning', 'rag', 'tool-calling'],
    contextWindow: 131000,
    costPerToken: 0,
    speed: 'slow',
    reasoning: true,
    vision: false,
    multilingual: false
  },
  {
    id: 'flash-3',
    name: 'Reka Flash 3',
    provider: 'Reka',
    capabilities: ['text', 'coding', 'reasoning'],
    contextWindow: 33000,
    costPerToken: 0,
    speed: 'fast',
    reasoning: true,
    vision: false,
    multilingual: false
  },
  {
    id: 'deepseek-r1-distill-qwen-14b',
    name: 'DeepSeek R1 Distill Qwen 14B',
    provider: 'DeepSeek',
    capabilities: ['text', 'reasoning'],
    contextWindow: 33000,
    costPerToken: 0,
    speed: 'medium',
    reasoning: true,
    vision: false,
    multilingual: false
  }
];

// Model Selection Strategy
export class ModelSelector {
  private models: AIModel[];

  constructor(models: AIModel[] = AVAILABLE_MODELS) {
    this.models = models;
  }

  selectModel(request: AIRequest): ModelSelection {
    const { taskType, priority, files } = request;
    
    let candidates = this.models;

    // Filter by task requirements
    if (taskType === 'vision' || files?.some(f => f.type.includes('image'))) {
      candidates = candidates.filter(m => m.vision);
    }

    if (taskType === 'reasoning') {
      candidates = candidates.filter(m => m.reasoning);
    }

    if (taskType === 'fast') {
      candidates = candidates.filter(m => m.speed === 'fast');
    }

    if (taskType === 'multilingual') {
      candidates = candidates.filter(m => m.multilingual);
    }

    // Score candidates based on priority and requirements
    const scoredCandidates = candidates.map(model => ({
      model,
      score: this.calculateScore(model, request),
      reasoning: this.generateReasoning(model, request)
    }));

    // Sort by score and return best match
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    const bestMatch = scoredCandidates[0];
    
    return {
      model: bestMatch.model,
      confidence: bestMatch.score,
      reasoning: bestMatch.reasoning
    };
  }

  private calculateScore(model: AIModel, request: AIRequest): number {
    let score = 0;

    // Base score
    score += 10;

    // Speed preference
    if (request.priority === 'high' && model.speed === 'fast') {
      score += 20;
    } else if (request.priority === 'low' && model.speed === 'slow') {
      score += 10;
    }

    // Context window (prefer larger for complex tasks)
    if (request.taskType === 'reasoning' && model.contextWindow > 50000) {
      score += 15;
    }

    // Cost efficiency (prefer free models)
    if (model.costPerToken === 0) {
      score += 10;
    }

    // Capability match
    if (request.taskType === 'vision' && model.vision) {
      score += 25;
    }
    if (request.taskType === 'reasoning' && model.reasoning) {
      score += 25;
    }

    return score;
  }

  private generateReasoning(model: AIModel, request: AIRequest): string {
    const reasons = [];
    
    if (request.taskType === 'vision' && model.vision) {
      reasons.push('Supports vision tasks');
    }
    if (request.taskType === 'reasoning' && model.reasoning) {
      reasons.push('Strong reasoning capabilities');
    }
    if (model.speed === 'fast') {
      reasons.push('Fast processing');
    }
    if (model.costPerToken === 0) {
      reasons.push('Free to use');
    }
    if (model.contextWindow > 50000) {
      reasons.push('Large context window');
    }

    return reasons.join(', ');
  }
}

// Multi-Model AI Service
export class MultiModelAIService {
  private modelSelector: ModelSelector;
  private fallbackModel: AIModel;

  constructor() {
    this.modelSelector = new ModelSelector();
    this.fallbackModel = AVAILABLE_MODELS.find(m => m.id === 'gemma-3n-4b')!;
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Select optimal model
      const modelSelection = this.modelSelector.selectModel(request);
      console.log(`🤖 Selected model: ${modelSelection.model.name} (${modelSelection.confidence}% confidence)`);
      console.log(`📝 Reasoning: ${modelSelection.reasoning}`);

      // Process with selected model
      const response = await this.callModel(modelSelection.model, request);
      
      const processingTime = Date.now() - startTime;
      
      return {
        content: response,
        model: modelSelection.model.name,
        tokensUsed: this.estimateTokens(request.prompt + response),
        processingTime,
        confidence: modelSelection.confidence,
        metadata: {
          modelId: modelSelection.model.id,
          reasoning: modelSelection.reasoning,
          taskType: request.taskType
        }
      };

    } catch (error) {
      console.error('❌ Primary model failed, trying fallback:', error);
      
      // Fallback to reliable model
      const fallbackResponse = await this.callModel(this.fallbackModel, request);
      
      const processingTime = Date.now() - startTime;
      
      return {
        content: fallbackResponse,
        model: this.fallbackModel.name,
        tokensUsed: this.estimateTokens(request.prompt + fallbackResponse),
        processingTime,
        confidence: 0.7, // Lower confidence for fallback
        metadata: {
          modelId: this.fallbackModel.id,
          fallback: true,
          originalError: error.message
        }
      };
    }
  }

  private async callModel(model: AIModel, request: AIRequest): Promise<string> {
    // Different API endpoints for different providers
    const endpoint = this.getEndpointForModel(model);
    const apiKey = this.getApiKeyForProvider(model.provider);
    
    const payload = this.buildPayload(model, request);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...this.getProviderHeaders(model.provider)
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.extractContent(data, model.provider);
  }

  private getEndpointForModel(model: AIModel): string {
    const endpoints: Record<string, string> = {
      'Google': 'https://generativelanguage.googleapis.com/v1beta/models',
      'Featherless': 'https://api.featherless.ai/v1/chat/completions',
      'Sarvam AI': 'https://api.sarvam.ai/v1/chat/completions',
      'NVIDIA': 'https://api.nvcf.nvidia.com/v1/chat/completions',
      'Reka': 'https://api.reka.ai/v1/chat/completions',
      'DeepSeek': 'https://api.deepseek.com/v1/chat/completions'
    };
    
    return endpoints[model.provider] || 'https://api.openrouter.ai/v1/chat/completions';
  }

  private getApiKeyForProvider(provider: string): string {
    // Get API keys from environment variables
    const apiKeys: Record<string, string> = {
      'Google': import.meta.env.VITE_GOOGLE_API_KEY || '',
      'Featherless': import.meta.env.VITE_FEATHERLESS_API_KEY || '',
      'Sarvam AI': import.meta.env.VITE_SARVAM_API_KEY || '',
      'NVIDIA': import.meta.env.VITE_NVIDIA_API_KEY || '',
      'Reka': import.meta.env.VITE_REKA_API_KEY || '',
      'DeepSeek': import.meta.env.VITE_DEEPSEEK_API_KEY || ''
    };
    
    return apiKeys[provider] || import.meta.env.VITE_OPENROUTER_API_KEY || '';
  }

  private getProviderHeaders(provider: string): Record<string, string> {
    const headers: Record<string, Record<string, string>> = {
      'Google': {
        'x-goog-api-key': this.getApiKeyForProvider('Google')
      },
      'NVIDIA': {
        'NVCF-API-KEY': this.getApiKeyForProvider('NVIDIA')
      }
    };
    
    return headers[provider] || {};
  }

  private buildPayload(model: AIModel, request: AIRequest): any {
    const basePayload = {
      model: model.id,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(model, request)
        },
        {
          role: 'user',
          content: request.prompt
        }
      ],
      max_tokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.7
    };

    // Add provider-specific modifications
    switch (model.provider) {
      case 'Google':
        return {
          ...basePayload,
          generationConfig: {
            maxOutputTokens: request.maxTokens || 2000,
            temperature: request.temperature || 0.7
          }
        };
      
      case 'NVIDIA':
        return {
          ...basePayload,
          stream: false,
          tools: request.taskType === 'reasoning' ? [{ type: 'function' }] : undefined
        };
      
      default:
        return basePayload;
    }
  }

  private getSystemPrompt(model: AIModel, request: AIRequest): string {
    let prompt = 'You are Skippy, an advanced AI study buddy. ';
    
    if (request.taskType === 'reasoning') {
      prompt += 'Use detailed reasoning and step-by-step thinking. ';
    }
    
    if (model.reasoning) {
      prompt += 'You have strong reasoning capabilities. Use them to provide thorough analysis. ';
    }
    
    if (model.vision) {
      prompt += 'You can process visual content. Analyze images carefully. ';
    }
    
    prompt += 'Be helpful, encouraging, and provide accurate information.';
    
    return prompt;
  }

  private extractContent(data: any, provider: string): string {
    switch (provider) {
      case 'Google':
        return data.candidates?.[0]?.content?.parts?.[0]?.text || data.text || '';
      
      case 'NVIDIA':
        return data.choices?.[0]?.message?.content || '';
      
      default:
        return data.choices?.[0]?.message?.content || data.content || data.text || '';
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  // Specialized methods for different task types
  async processReasoningTask(prompt: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<AIResponse> {
    return this.processRequest({
      prompt,
      taskType: 'reasoning',
      priority,
      temperature: 0.3 // Lower temperature for reasoning tasks
    });
  }

  async processVisionTask(prompt: string, files: File[]): Promise<AIResponse> {
    return this.processRequest({
      prompt,
      taskType: 'vision',
      priority: 'medium',
      files
    });
  }

  async processFastTask(prompt: string): Promise<AIResponse> {
    return this.processRequest({
      prompt,
      taskType: 'fast',
      priority: 'high',
      maxTokens: 1000,
      temperature: 0.7
    });
  }

  async processMultilingualTask(prompt: string, language: string): Promise<AIResponse> {
    const enhancedPrompt = `Please respond in ${language}. ${prompt}`;
    
    return this.processRequest({
      prompt: enhancedPrompt,
      taskType: 'multilingual',
      priority: 'medium'
    });
  }
}

// Export singleton instance
export const multiModelAI = new MultiModelAIService();

// Helper functions for common tasks
export const aiService = {
  // Reasoning tasks (complex analysis, planning, problem-solving)
  async reason(prompt: string): Promise<string> {
    const response = await multiModelAI.processReasoningTask(prompt);
    return response.content;
  },

  // Fast tasks (simple responses, quick answers)
  async quick(prompt: string): Promise<string> {
    const response = await multiModelAI.processFastTask(prompt);
    return response.content;
  },

  // Vision tasks (image analysis, PDF processing)
  async vision(prompt: string, files: File[]): Promise<string> {
    const response = await multiModelAI.processVisionTask(prompt, files);
    return response.content;
  },

  // Multilingual tasks
  async multilingual(prompt: string, language: string): Promise<string> {
    const response = await multiModelAI.processMultilingualTask(prompt, language);
    return response.content;
  },

  // General purpose
  async process(prompt: string, options: Partial<AIRequest> = {}): Promise<string> {
    const response = await multiModelAI.processRequest({
      prompt,
      taskType: 'general',
      priority: 'medium',
      ...options
    });
    return response.content;
  }
};



// Voice-Enabled Agentic Interface - Makes your AI speak and listen like a real person
// Handles speech recognition, natural responses, and personality-driven conversation

import { agenticMemory } from "./agenticMemory";
import { agenticBrain } from "./agenticBrain";
import { AgentOrchestrator } from "./agentOrchestrator";

// Add type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface VoiceConfig {
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  voicePreference: string;
  enableEmotionalTone: boolean;
  personalityLevel: "professional" | "friendly" | "enthusiastic" | "calm";
}

export interface ConversationState {
  isListening: boolean;
  isSpeaking: boolean;
  lastResponse: string;
  conversationFlow: string[];
  currentContext: string;
  emotionalState: "neutral" | "excited" | "concerned" | "encouraging";
}

export class VoiceEnabledAgent {
  private speechRecognition: any = null;
  private speechSynthesis: SpeechSynthesis;
  private voiceConfig: VoiceConfig;
  private conversationState: ConversationState;

  constructor() {
    this.speechSynthesis = window.speechSynthesis;

    this.voiceConfig = {
      speechRate: 0.9,
      speechPitch: 1.1,
      speechVolume: 0.8,
      voicePreference: "female",
      enableEmotionalTone: true,
      personalityLevel: "friendly",
    };

    this.conversationState = {
      isListening: false,
      isSpeaking: false,
      lastResponse: "",
      conversationFlow: [],
      currentContext: "",
      emotionalState: "neutral",
    };

    this.initializeSpeechRecognition();
  }

  // Initialize speech recognition
  private initializeSpeechRecognition() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognition();

      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = "en-US";

      this.speechRecognition.onstart = () => {
        console.log("🎤 Voice recognition started");
        this.conversationState.isListening = true;
      };

      this.speechRecognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join("");

        if (event.results[event.results.length - 1].isFinal) {
          console.log("🎤 Final transcript:", transcript);
          this.processVoiceInput(transcript);
        }
      };

      this.speechRecognition.onerror = (event: any) => {
        console.error("🎤 Speech recognition error:", event.error);
        this.speak("I'm sorry, I didn't catch that. Could you try again?");
      };

      this.speechRecognition.onend = () => {
        this.conversationState.isListening = false;
        console.log("🎤 Voice recognition ended");
      };
    }
  }

  // Start listening for voice input
  startListening(): void {
    if (this.speechRecognition && !this.conversationState.isListening) {
      try {
        this.speechRecognition.start();
        this.speak("I'm listening! What would you like to work on?");
      } catch (error) {
        console.error("Failed to start voice recognition:", error);
        this.speak(
          "Sorry, I couldn't start listening. You can still type your questions!"
        );
      }
    }
  }

  // Stop listening
  stopListening(): void {
    if (this.speechRecognition && this.conversationState.isListening) {
      this.speechRecognition.stop();
    }
  }

  // Process voice input with intelligence
  private async processVoiceInput(transcript: string): Promise<void> {
    console.log(`🤖 Processing voice input: "${transcript}"`);

    // Remember this conversation
    this.conversationState.conversationFlow.push(`User: ${transcript}`);
    this.conversationState.currentContext = transcript;

    try {
      // Use agentic brain to make intelligent decisions
      const decision = await agenticBrain.makeDecision(transcript);

      // Execute actions if needed
      let executionResult = "";
      if (decision.primaryAction.length > 0) {
        const orchestratedResponse = await AgentOrchestrator.run(transcript);
        executionResult = orchestratedResponse.message;
      }

      // Generate comprehensive response
      const response = this.generateConversationalResponse(
        decision,
        executionResult
      );

      // Speak the response with personality
      this.speakWithPersonality(response, decision.emotionalResponse);

      // Remember the interaction
      this.conversationState.conversationFlow.push(`Assistant: ${response}`);
      this.conversationState.lastResponse = response;
    } catch (error) {
      console.error("Error processing voice input:", error);
      this.speak(
        "I encountered an issue processing that. Could you try rephrasing your request?"
      );
    }
  }

  // Generate natural conversational response
  private generateConversationalResponse(
    decision: any,
    executionResult: string
  ): string {
    let response = "";

    // Start with emotional acknowledgment
    if (decision.emotionalResponse) {
      response += decision.emotionalResponse + "\n\n";
    }

    // Add reasoning in conversational tone
    response += this.makeConversational(decision.reasoning) + "\n";

    // Include execution results if any
    if (executionResult) {
      response += `Here's what I accomplished: ${executionResult}\n`;
    }

    // Add proactive suggestions naturally
    if (decision.proactiveSuggestions.length > 0) {
      response +=
        "\n" + this.formatSuggestionsNaturally(decision.proactiveSuggestions);
    }

    // Add follow-up questions
    if (decision.followUpQuestions.length > 0) {
      response += "\n" + decision.followUpQuestions[0];
    }

    return this.addPersonalityTouch(response);
  }

  // Make text more conversational
  private makeConversational(text: string): string {
    return text
      .replace(/\. /g, ". ")
      .replace(/Let me help you/g, "I'd love to help you")
      .replace(/I will/g, "I'll")
      .replace(/You can/g, "You could")
      .replace(/This is/g, "This looks like");
  }

  // Format suggestions naturally
  private formatSuggestionsNaturally(suggestions: string[]): string {
    if (suggestions.length === 1) {
      return `By the way, ${suggestions[0].toLowerCase()}`;
    } else if (suggestions.length === 2) {
      return `I was thinking - ${suggestions[0].toLowerCase()} Or ${suggestions[1].toLowerCase()}`;
    } else {
      return `Here are some ideas: ${suggestions
        .slice(0, 2)
        .map((s) => s.toLowerCase())
        .join(", ")}`;
    }
  }

  // Add personality touches based on config
  private addPersonalityTouch(response: string): string {
    const { personalityLevel } = this.voiceConfig;

    switch (personalityLevel) {
      case "enthusiastic":
        return response + " Let me know what you think!";
      case "calm":
        return response + " Take your time with this.";
      case "friendly":
        return response + " I'm here whenever you need help!";
      default:
        return response;
    }
  }

  // Speak with emotional tone and personality
  private speakWithPersonality(text: string, emotionalContext?: string): void {
    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice based on emotional context
    if (
      emotionalContext?.includes("exciting") ||
      emotionalContext?.includes("enthusiasm")
    ) {
      utterance.rate = this.voiceConfig.speechRate + 0.1;
      utterance.pitch = this.voiceConfig.speechPitch + 0.1;
      this.conversationState.emotionalState = "excited";
    } else if (
      emotionalContext?.includes("challenging") ||
      emotionalContext?.includes("difficult")
    ) {
      utterance.rate = this.voiceConfig.speechRate - 0.1;
      utterance.pitch = this.voiceConfig.speechPitch - 0.1;
      this.conversationState.emotionalState = "concerned";
    } else {
      utterance.rate = this.voiceConfig.speechRate;
      utterance.pitch = this.voiceConfig.speechPitch;
      this.conversationState.emotionalState = "encouraging";
    }

    utterance.volume = this.voiceConfig.speechVolume;

    // Select appropriate voice
    const voices = this.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) =>
      voice.name.toLowerCase().includes(this.voiceConfig.voicePreference)
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Speak with personality
    utterance.onstart = () => {
      this.conversationState.isSpeaking = true;
      console.log("🗣️ Speaking:", text.substring(0, 50) + "...");
    };

    utterance.onend = () => {
      this.conversationState.isSpeaking = false;
      console.log("🗣️ Finished speaking");

      // Continue listening after speaking (optional)
      if (this.conversationState.isListening) {
        setTimeout(() => {
          if (!this.conversationState.isSpeaking) {
            this.startListening();
          }
        }, 500);
      }
    };

    this.speechSynthesis.speak(utterance);
  }

  // Simple speak method for non-conversational responses
  private speak(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.voiceConfig.speechRate;
    utterance.pitch = this.voiceConfig.speechPitch;
    utterance.volume = this.voiceConfig.speechVolume;

    this.speechSynthesis.speak(utterance);
  }

  // Handle text input (for hybrid text/voice interaction)
  async processTextInput(text: string): Promise<string> {
    console.log(`💬 Processing text input: "${text}"`);

    const decision = await agenticBrain.makeDecision(text);
    let executionResult = "";

    if (decision.primaryAction.length > 0) {
      const orchestratedResponse = await AgentOrchestrator.run(text);
      executionResult = orchestratedResponse.message;
    }

    const response = this.generateConversationalResponse(
      decision,
      executionResult
    );

    // Remember the interaction
    agenticMemory.rememberInteraction(
      text,
      response,
      "text_interaction",
      "success"
    );

    return response;
  }

  // Update voice configuration
  updateVoiceConfig(newConfig: Partial<VoiceConfig>): void {
    this.voiceConfig = { ...this.voiceConfig, ...newConfig };
    console.log("🔧 Voice config updated:", this.voiceConfig);
  }

  // Get conversation state
  getConversationState(): ConversationState {
    return { ...this.conversationState };
  }

  // Start a conversation with greeting
  startConversation(): void {
    const greeting = this.generateContextualGreeting();
    this.speakWithPersonality(greeting);
  }

  // Generate contextual greeting based on time and memory
  private generateContextualGreeting(): string {
    const hour = new Date().getHours();
    let timeGreeting = "";

    if (hour < 12) timeGreeting = "Good morning!";
    else if (hour < 17) timeGreeting = "Good afternoon!";
    else timeGreeting = "Good evening!";

    const memoryContext = agenticMemory.getRelevantContext("greeting");
    const personalizedPart =
      memoryContext.length > 0
        ? "Great to see you back!"
        : "I'm excited to meet you!";

    return `${timeGreeting} ${personalizedPart} Ready to study together? I'm here to help with anything you need!`;
  }

  // Clean up resources
  cleanup(): void {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }
    this.speechSynthesis.cancel();
  }
}

// Export singleton instance
export const voiceAgent = new VoiceEnabledAgent();

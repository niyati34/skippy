// Enhanced Agentic Integration for DashboardAI
// Integrates memory, brain, and voice capabilities into the main dashboard

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Brain, Heart, Zap, MessageCircle } from "lucide-react";
import { agenticMemory } from "@/lib/agenticMemory";
import { agenticBrain } from "@/lib/agenticBrain";
import { voiceAgent } from "@/lib/voiceAgent";
import { AgentOrchestrator } from "@/lib/agentOrchestrator";

interface AgenticDashboardProps {
  onScheduleUpdate: (schedule: any[]) => void;
  onFlashcardsUpdate: (flashcards: any[]) => void;
  onNotesUpdate: (notes: any[]) => void;
  onFunLearningUpdate: (content: string, type: string) => void;
}

export const AgenticDashboard: React.FC<AgenticDashboardProps> = ({
  onScheduleUpdate,
  onFlashcardsUpdate,
  onNotesUpdate,
  onFunLearningUpdate,
}) => {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      type: "user" | "assistant";
      content: string;
      timestamp: Date;
      emotional?: string;
      reasoning?: string;
      confidence?: number;
    }>
  >([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral");
  const [agentPersonality, setAgentPersonality] = useState<string>("friendly");
  const [userProfile, setUserProfile] = useState<any>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with a greeting
    initializeAgent();
    return () => {
      voiceAgent.cleanup();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeAgent = async () => {
    const greeting = generateContextualGreeting();
    addMessage("assistant", greeting, "excited");

    // Load user profile from memory
    const memoryContext = agenticMemory.getRelevantContext("user profile");
    setUserProfile({ hasHistory: memoryContext.length > 0 });
  };

  const generateContextualGreeting = (): string => {
    const hour = new Date().getHours();
    let timeGreeting = "";

    if (hour < 12) timeGreeting = "Good morning!";
    else if (hour < 17) timeGreeting = "Good afternoon!";
    else timeGreeting = "Good evening!";

    const memoryContext = agenticMemory.getRelevantContext("greeting");
    const isReturningUser = memoryContext.length > 0;

    if (isReturningUser) {
      return `${timeGreeting} Welcome back! I remember our previous conversations and I'm ready to continue helping you with your studies. What would you like to work on today? 📚`;
    } else {
      return `${timeGreeting} I'm your AI study buddy! I can help you with flashcards, notes, schedules, and much more. I'll remember our conversations and learn your preferences as we go. What would you like to start with? 🌟`;
    }
  };

  const addMessage = (
    type: "user" | "assistant",
    content: string,
    emotional?: string,
    reasoning?: string,
    confidence?: number
  ) => {
    const newMessage = {
      type,
      content,
      timestamp: new Date(),
      emotional,
      reasoning,
      confidence,
    };

    setMessages((prev) => [...prev, newMessage]);

    if (type === "assistant" && emotional) {
      setCurrentEmotion(emotional);
    }
  };

  const handleTextInput = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage = inputText.trim();
    setInputText("");
    setIsProcessing(true);

    // Add user message
    addMessage("user", userMessage);

    try {
      // Process with agentic brain
      const decision = await agenticBrain.makeDecision(userMessage);

      // Execute actions if needed
      let executionResult = "";
      if (decision.primaryAction.length > 0) {
        const orchestratedResponse = await AgentOrchestrator.run(userMessage);
        executionResult = orchestratedResponse.message;

        // Update appropriate UI components based on action type
        updateUIComponents(
          decision.primaryAction,
          orchestratedResponse.results
        );
      }

      // Generate conversational response
      const response = generateConversationalResponse(
        decision,
        executionResult
      );

      // Add assistant message
      addMessage(
        "assistant",
        response,
        decision.emotionalResponse,
        decision.reasoning,
        decision.confidence
      );

      // Remember the interaction
      agenticMemory.rememberInteraction(
        userMessage,
        response,
        "text_interaction",
        "success"
      );
    } catch (error) {
      console.error("Error processing input:", error);
      addMessage(
        "assistant",
        "I encountered an issue processing that. Could you try rephrasing your request?",
        "concerned"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const generateConversationalResponse = (
    decision: any,
    executionResult: string
  ): string => {
    let response = "";

    // Start with emotional acknowledgment
    if (decision.emotionalResponse) {
      response += decision.emotionalResponse + "\n\n";
    }

    // Add reasoning in conversational tone
    if (decision.reasoning) {
      response += decision.reasoning + "\n";
    }

    // Include execution results if any
    if (executionResult) {
      response += `${executionResult}\n`;
    }

    // Add proactive suggestions naturally
    if (decision.proactiveSuggestions?.length > 0) {
      response +=
        "\n" + formatSuggestionsNaturally(decision.proactiveSuggestions);
    }

    // Add follow-up questions
    if (decision.followUpQuestions?.length > 0) {
      response += "\n\n" + decision.followUpQuestions[0];
    }

    return response.trim();
  };

  const formatSuggestionsNaturally = (suggestions: string[]): string => {
    if (suggestions.length === 1) {
      return `💡 ${suggestions[0]}`;
    } else if (suggestions.length === 2) {
      return `💡 Here are some ideas: ${suggestions[0]} Or ${suggestions[1]}`;
    } else {
      return `💡 Some suggestions: ${suggestions.slice(0, 2).join(", ")}`;
    }
  };

  const updateUIComponents = (actions: any[], results: any[]) => {
    actions.forEach((action, index) => {
      const result = results[index];
      if (!result?.success) return;

      switch (action.type) {
        case "create":
          if (action.target === "flashcards" && result.data) {
            onFlashcardsUpdate(result.data);
          } else if (action.target === "notes" && result.data) {
            onNotesUpdate(result.data);
          } else if (action.target === "schedule" && result.data) {
            onScheduleUpdate(result.data);
          }
          break;
        // Add other action types as needed
      }
    });
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      voiceAgent.stopListening();
      setIsListening(false);
    } else {
      voiceAgent.startListening();
      setIsListening(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextInput();
    }
  };

  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case "excited":
        return "🎉";
      case "concerned":
        return "🤔";
      case "encouraging":
        return "💪";
      case "friendly":
        return "😊";
      default:
        return "🤖";
    }
  };

  const getPersonalityBadgeColor = (personality: string) => {
    switch (personality) {
      case "enthusiastic":
        return "bg-orange-100 text-orange-800";
      case "calm":
        return "bg-blue-100 text-blue-800";
      case "friendly":
        return "bg-green-100 text-green-800";
      case "professional":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-purple-100 text-purple-800";
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      {/* Agent Status Header */}
      <Card className="p-4 mb-4 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="font-semibold text-gray-800">AI Study Buddy</h3>
              <p className="text-sm text-gray-600">
                {getEmotionIcon(currentEmotion)} Currently feeling{" "}
                {currentEmotion}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge className={getPersonalityBadgeColor(agentPersonality)}>
              {agentPersonality}
            </Badge>
            <Button
              onClick={handleVoiceToggle}
              variant={isListening ? "destructive" : "outline"}
              size="sm"
              className="flex items-center space-x-1"
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span>{isListening ? "Stop" : "Listen"}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 p-4 mb-4 overflow-hidden">
        <div className="h-full overflow-y-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>

                {/* Show reasoning and confidence for assistant messages */}
                {message.type === "assistant" &&
                  (message.reasoning || message.confidence) && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs opacity-75">
                      {message.confidence && (
                        <div className="flex items-center space-x-1">
                          <Zap className="w-3 h-3" />
                          <span>
                            Confidence:{" "}
                            {Math.round((message.confidence || 0) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                <div className="text-xs opacity-75 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  <span className="ml-2 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Input Area */}
      <Card className="p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your studies..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          />
          <Button
            onClick={handleTextInput}
            disabled={!inputText.trim() || isProcessing}
            className="px-6"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send • Click the mic to speak • I remember our
          conversations
        </div>
      </Card>
    </div>
  );
};

export default AgenticDashboard;

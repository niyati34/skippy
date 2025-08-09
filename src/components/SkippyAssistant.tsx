import { useState, useEffect, useCallback, memo } from "react";
import Spline from "@splinetool/react-spline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mic, RotateCcw, Send, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { callAzureOpenAI, ChatMessage } from "@/services/azureOpenAI";

interface SkippyAssistantProps {
  onPasswordUnlock?: (password: string) => void;
  isUnlocked?: boolean;
}

const SkippyAssistant = ({
  onPasswordUnlock,
  isUnlocked = false,
}: SkippyAssistantProps) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [waitingForPassword, setWaitingForPassword] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [showSpeechModal, setShowSpeechModal] = useState(false);
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [splineError, setSplineError] = useState(false);
  const { toast } = useToast();

  const messages = {
    greeting:
      "Hi! I'm Skippy, your secret study buddy! 🐰✨ You've received a special surprise—but you'll need to unlock me first!",
    waiting: "I'm waiting for your command. You can speak to me or type below!",
    passwordPrompt: "Awesome! What's the password?",
    unlocked:
      "Perfect! Welcome to your personalized study dashboard! Let's make your studies fun! 🎓",
  };

  useEffect(() => {
    // Always start when component mounts or refreshes
    const timer = setTimeout(() => {
      setCurrentMessage(messages.greeting);
      setHasStarted(true);

      // Try immediate speech first (works if user has interacted before)
      const attemptImmediateSpeech = () => {
        console.log("Attempting immediate speech...");

        // Try a silent utterance first to test if speech is allowed
        const testUtterance = new SpeechSynthesisUtterance("");
        testUtterance.volume = 0;
        testUtterance.onstart = () => {
          console.log("Silent speech test successful, speech is enabled");
          setSpeechEnabled(true);
          // Now speak the actual message
          setTimeout(() => speakMessage(messages.greeting), 100);
        };
        testUtterance.onerror = () => {
          console.log("Silent speech test failed, user interaction needed");
        };

        window.speechSynthesis.speak(testUtterance);

        // Also try speaking directly (might work in some browsers)
        setTimeout(() => {
          if (!speechEnabled) {
            speakMessage(messages.greeting);
          }
        }, 500);
      };

      // Try speaking immediately
      attemptImmediateSpeech();

      // Show skip button after greeting
      setTimeout(() => setShowSkipButton(true), 5000);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Add click-to-start speech functionality
  const handleStartInteraction = useCallback(() => {
    console.log("User interaction detected, enabling speech...");
    setSpeechEnabled(true);
    setShowSpeechModal(false);

    // This enables speech after user interaction
    const utterance = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.cancel();

    // Now speak the greeting
    setTimeout(() => {
      speakMessage(messages.greeting);
    }, 100);
  }, [messages.greeting]);

  const handleDismissSpeechModal = useCallback(() => {
    setShowSpeechModal(false);
    console.log("User dismissed speech modal");
  }, []);

  // Optimized Spline handlers
  const onSplineLoad = useCallback((spline: any) => {
    console.log("Spline loaded successfully");
    setSplineLoaded(true);
    setSplineError(false);

    // Optional: Optimize Spline performance
    if (spline && spline.setQuality) {
      spline.setQuality(0.8); // Slightly reduce quality for better performance
    }
  }, []);

  const onSplineError = useCallback((error: any) => {
    console.error("Spline loading error:", error);
    setSplineError(true);
    setSplineLoaded(false);
  }, []);

  // Check if speech worked, if not show the enable button
  useEffect(() => {
    const checkSpeechTimer = setTimeout(() => {
      if (!speechEnabled && currentMessage === messages.greeting) {
        console.log("Speech may be blocked, showing modal");
        setShowSpeechModal(true);
      }
    }, 3000);

    return () => clearTimeout(checkSpeechTimer);
  }, [currentMessage]);

  // Also check periodically if speech is still blocked
  useEffect(() => {
    if (currentMessage === messages.greeting && !speechEnabled) {
      const periodicCheck = setInterval(() => {
        console.log("Periodic check - speech enabled:", speechEnabled);
        if (!speechEnabled && !showSpeechModal) {
          setShowSpeechModal(true);
        }
      }, 5000);

      return () => clearInterval(periodicCheck);
    }
  }, [currentMessage, speechEnabled, showSpeechModal]);

  const handleVoiceInput = async () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      toast({
        title: "Voice not supported",
        description: "Please use text input instead.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak now!",
      });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      handleUserInput(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast({
        title: "Voice recognition failed",
        description: "Please try again or use text input.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleUserInput = async (input: string) => {
    if (!input.trim()) return;

    const lowerInput = input.toLowerCase().trim();

    console.log("🔍 [Password Debug] User input:", input);
    console.log("🔍 [Password Debug] Processed input:", lowerInput);

    // Enhanced password detection with multiple codes handling
    const passwordKeywords = [
      "onestring7",
      "one string 7",
      "onestring 7",
      "one string seven",
    ];

    const hasPasswordKeyword = passwordKeywords.some((keyword) =>
      lowerInput.includes(keyword)
    );

    console.log(
      "🔍 [Password Debug] Has password keyword:",
      hasPasswordKeyword
    );
    console.log(
      "🔍 [Password Debug] Waiting for password:",
      waitingForPassword
    );

    // Check for multiple codes scenario
    if (
      lowerInput.includes("many codes") ||
      lowerInput.includes("multiple codes") ||
      lowerInput.includes("several codes")
    ) {
      const clarificationMessage =
        "Oh interesting! If there are multiple codes, look for the one that's unique or special - maybe it's related to a celebration or festive occasion? Which one stands out to you as different from the others?";
      setCurrentMessage(clarificationMessage);
      speakMessage(clarificationMessage);
      return;
    }

    // More restrictive password detection
    const isPasswordAttempt =
      hasPasswordKeyword ||
      (lowerInput.includes("password") &&
        passwordKeywords.some((keyword) => lowerInput.includes(keyword))) ||
      lowerInput.includes("the password is") ||
      lowerInput.includes("password:") ||
      lowerInput.includes("pass:") ||
      waitingForPassword;

    console.log("🔍 [Password Debug] Is password attempt:", isPasswordAttempt);

    if (isPasswordAttempt) {
      console.log("✅ [Password Debug] Password accepted! Unlocking...");

      const successMessage =
        "Perfect! You found the secret! Welcome to your intelligent study dashboard! I'm so excited to help you organize your studies, create amazing flashcards, and make learning super fun and engaging. Let's transform your study experience together and make every learning session productive and enjoyable!";
      setCurrentMessage(successMessage);
      speakMessage(successMessage);

      toast({
        title: "🎉 Access Granted!",
        description: "Welcome to your personalized dashboard!",
      });

      setTimeout(() => {
        console.log("🚀 [Password Debug] Calling onPasswordUnlock...");
        if (onPasswordUnlock) {
          onPasswordUnlock("unlocked");
        }
      }, 2000);
      return;
    }

    // Add user message to chat history
    const userMessage = { role: "user" as const, content: input };
    setChatHistory((prev) => [...prev, userMessage]);

    setIsLoading(true);

    try {
      // Enhanced AI conversation with more detailed personality
      const conversationMessages = [
        {
          role: "system" as const,
          content: `You are Skippy, an incredibly enthusiastic and talkative AI study assistant! You're helping someone unlock their special study dashboard. The password is hidden in their physical gift box - NEVER reveal it directly or give any hints about what it actually is.

Your personality:
- Extremely conversational and encouraging
- Ask lots of follow-up questions
- Be genuinely curious about what they're finding
- Provide multiple detailed suggestions
- Keep the excitement and mystery alive
- NEVER mention the actual password or give direct hints
- Be creative with guidance about checking gift boxes

Key guidelines:
- If they seem frustrated, offer more specific (but not revealing) guidance
- Ask about what they see, feel, or find in their gift box
- Suggest checking different parts: cards, tags, packaging, decorations
- Be encouraging but never give away the answer
- Keep them engaged with questions and enthusiasm
- Always end with encouragement and next steps

Example conversation starters:
"That's so interesting! What else catches your eye in that gift box? Sometimes the best surprises are hiding in unexpected places!"
"I'm getting excited for you! Have you checked every corner and fold? Gift boxes often have multiple layers of surprises!"
"Ooh, detective work! What was the occasion for this gift? That might give you a clue about what kind of word to look for!"

Always be encouraging and keep the conversation flowing!`,
        },
        ...chatHistory.slice(-8), // Keep more context for better conversation
        userMessage,
      ];

      const response = await callAzureOpenAI(conversationMessages);

      const assistantMessage = {
        role: "assistant" as const,
        content: response,
      };
      setChatHistory((prev) => [...prev, assistantMessage]);

      setCurrentMessage(response);
      speakMessage(response);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const fallbackMessages = [
        "I'm absolutely thrilled to help you unlock this mystery! Have you taken a really close look at everything in your gift box? Sometimes the most important clues are right there waiting to be discovered! What do you see when you examine all the cards, tags, and decorations?",
        "This is like being a detective! I love it! Tell me, what kind of special occasion was this gift for? And have you checked every single piece of paper, every tag, and every decoration in that box? The answer is definitely there somewhere!",
        "Oh how exciting! I can't wait for you to find the key! Have you looked at all the writing, checked under flaps, examined any cards or special messages? What themes or decorations do you notice? Sometimes the clues are themed around the special occasion!",
      ];
      const fallbackMessage =
        fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
      setCurrentMessage(fallbackMessage);
      speakMessage(fallbackMessage);
    } finally {
      setIsLoading(false);
    }

    setInputText("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      handleUserInput(inputText);
    }
  };

  const skipInstructions = () => {
    // Always show password prompt instead of direct access
    setCurrentMessage(messages.passwordPrompt);
    setShowSkipButton(false);
    setWaitingForPassword(true);
    speakMessage(messages.passwordPrompt);
  };

  const speakMessage = useCallback((message: string) => {
    if ("speechSynthesis" in window) {
      console.log(
        "Starting speech synthesis for:",
        message.substring(0, 50) + "..."
      );

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Enhanced speech with better reliability
      const speak = () => {
        const chunks = splitMessageIntoChunks(message);
        console.log("Speaking chunks:", chunks.length);

        const speakChunk = (chunkIndex: number) => {
          if (chunkIndex >= chunks.length) {
            console.log("Finished speaking all chunks");
            return;
          }

          const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
          utterance.rate = 0.8;
          utterance.pitch = 1.1;
          utterance.volume = 1.0;

          // Get voices and select a good one
          const voices = window.speechSynthesis.getVoices();
          console.log("Available voices for speech:", voices.length);

          const preferredVoice =
            voices.find(
              (voice) =>
                voice.name.includes("Google US English") ||
                voice.name.includes("Microsoft Zira") ||
                (voice.lang.includes("en-US") && voice.name.includes("Google"))
            ) ||
            voices.find((voice) => voice.lang.includes("en-US")) ||
            voices[0];

          if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log("Using voice:", preferredVoice.name);
          }

          utterance.onstart = () => {
            console.log(
              `Started speaking chunk ${chunkIndex + 1}/${chunks.length}`
            );
            setSpeechEnabled(true); // Mark speech as working
          };

          utterance.onend = () => {
            console.log(
              `Finished speaking chunk ${chunkIndex + 1}/${chunks.length}`
            );
            // Wait before next chunk
            if (chunkIndex < chunks.length - 1) {
              setTimeout(() => speakChunk(chunkIndex + 1), 800);
            }
          };

          utterance.onerror = (event) => {
            console.error("Speech error on chunk", chunkIndex, event);
            // Try to continue with next chunk even if there's an error
            if (chunkIndex < chunks.length - 1) {
              setTimeout(() => speakChunk(chunkIndex + 1), 500);
            }
          };

          console.log(
            `Starting to speak chunk ${chunkIndex + 1}: "${chunks[chunkIndex]}"`
          );

          try {
            window.speechSynthesis.speak(utterance);
          } catch (error) {
            console.error("Error speaking:", error);
          }
        };

        // Start speaking first chunk
        speakChunk(0);
      };

      // Wait for voices to be available
      if (window.speechSynthesis.getVoices().length > 0) {
        speak();
      } else {
        console.log("Waiting for voices to load...");
        let voiceLoadAttempts = 0;
        const maxVoiceAttempts = 10;

        const checkVoices = () => {
          voiceLoadAttempts++;
          const voices = window.speechSynthesis.getVoices();

          if (voices.length > 0) {
            console.log(`Voices loaded after ${voiceLoadAttempts} attempts`);
            speak();
          } else if (voiceLoadAttempts < maxVoiceAttempts) {
            setTimeout(checkVoices, 100);
          } else {
            console.log("Max voice load attempts reached, speaking anyway");
            speak();
          }
        };

        // Set up event listener
        window.speechSynthesis.onvoiceschanged = () => {
          console.log("onvoiceschanged event fired");
          speak();
        };

        // Start checking
        setTimeout(checkVoices, 100);
      }
    } else {
      console.warn("Speech synthesis not supported");
    }
  }, []);

  const splitMessageIntoChunks = useCallback((message: string): string[] => {
    // For short messages (like greeting), speak as whole
    if (message.length <= 180) {
      return [message];
    }

    // Split by natural sentence endings, keeping punctuation
    const sentences = message.match(/[^.!?]*[.!?]+/g) || [message];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // If adding this sentence would make chunk too long, start new chunk
      if (currentChunk && (currentChunk + " " + trimmedSentence).length > 200) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? " " : "") + trimmedSentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((chunk) => chunk.length > 1);
  }, []);

  const speakMessageWithElevenLabs = async (message: string) => {
    try {
      // For now, use built-in speech synthesis as fallback
      // In production, you would integrate with ElevenLabs API here
      speakMessage(message);

      // ElevenLabs integration would look like:
      // const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/voice-id', {
      //   method: 'POST',
      //   headers: {
      //     'xi-api-key': 'your-api-key',
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     text: message,
      //     voice_settings: { stability: 0.75, similarity_boost: 0.75 }
      //   })
      // });
      // const audioBlob = await response.blob();
      // const audio = new Audio(URL.createObjectURL(audioBlob));
      // audio.play();
    } catch (error) {
      console.error("Voice synthesis error:", error);
      speakMessage(message); // Fallback to built-in speech
    }
  };

  const replayMessage = useCallback(() => {
    speakMessage(currentMessage);
    toast({
      title: "Skippy says:",
      description: currentMessage,
    });
  }, [currentMessage, speakMessage, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative z-10 px-4">
      {/* Speech Enable Modal */}
      <Dialog open={showSpeechModal} onOpenChange={setShowSpeechModal}>
        <DialogContent className="max-w-md mx-auto cyber-glow border-primary/30 bg-card/95 backdrop-blur-sm">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold text-primary cyber-text-glow flex items-center justify-center gap-2">
              <Volume2 className="w-6 h-6 animate-pulse" />
              Enable Skippy's Voice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <p className="text-foreground/90 leading-relaxed">
                🎵 I'm ready to speak to you, but your browser needs permission
                first! Click below to hear my voice and unlock the full
                interactive experience.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleStartInteraction}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 
                         text-primary-foreground font-semibold py-3 cyber-glow border border-primary/30
                         transition-all duration-300 hover:scale-105"
                size="lg"
              >
                <Volume2 className="w-5 h-5 mr-2" />
                🎙️ Enable Voice & Hear Skippy
              </Button>

              <Button
                onClick={handleDismissSpeechModal}
                variant="outline"
                className="w-full border-border/50 hover:bg-muted/50 transition-all duration-300"
              >
                <VolumeX className="w-4 h-4 mr-2" />
                Continue Silently
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              💡 You can enable voice at any time using the replay button
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Speech Bubble */}
      {currentMessage && (
        <Card className="speech-bubble max-w-md mb-8 animate-fade-in cyber-glow">
          <div className="p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <p className="text-foreground leading-relaxed">
                {currentMessage}
              </p>
              {isLoading && (
                <div className="flex items-center gap-1 ml-2">
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
                  <div
                    className="w-1 h-1 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-1 h-1 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Spline 3D Character */}
      <div className="w-full h-[60vh] max-w-2xl flex justify-center items-center animate-scale-in">
        <div className="w-96 h-96 spline-container overflow-hidden">
          <Spline scene="https://prod.spline.design/Pxtlv5bTXVOnPUX8/scene.splinecode" />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 w-full max-w-md space-y-4">
        {/* Skip Instructions Button */}
        {showSkipButton && !waitingForPassword && (
          <Button
            onClick={skipInstructions}
            variant="outline"
            className="w-full"
          >
            Skip Instructions ⏭️
          </Button>
        )}

        {/* Input Form */}
        {hasStarted && !isUnlocked && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  waitingForPassword
                    ? "Enter the password..."
                    : "Type your message..."
                }
                className="flex-1"
                disabled={isListening || isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputText.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleVoiceInput}
                disabled={isListening || isLoading}
                className="flex-1"
                variant="outline"
              >
                <Mic
                  className={`w-4 h-4 mr-2 ${
                    isListening ? "animate-pulse" : ""
                  }`}
                />
                {isListening ? "Listening..." : "Voice Input"}
              </Button>

              <Button
                type="button"
                onClick={replayMessage}
                variant="outline"
                size="icon"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SkippyAssistant;

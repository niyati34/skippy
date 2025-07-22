import { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mic, RotateCcw, Send, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { callAzureOpenAI, ChatMessage } from '@/services/azureOpenAI';

interface SkippyAssistantProps {
  onPasswordUnlock?: (password: string) => void;
  isUnlocked?: boolean;
}

const SkippyAssistant = ({ onPasswordUnlock, isUnlocked = false }: SkippyAssistantProps) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [waitingForPassword, setWaitingForPassword] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const { toast } = useToast();

  const messages = {
    greeting: "Hi! I'm Skippy, your secret study buddy! 🐰✨ You've received a special surprise—but you'll need to unlock me first!",
    waiting: "I'm waiting for your command. You can speak to me or type below!",
    passwordPrompt: "Awesome! What's the password?",
    unlocked: "Perfect! Welcome to your personalized study dashboard! Let's make your studies fun! 🎓"
  };

  useEffect(() => {
    if (!hasStarted) {
      const timer = setTimeout(() => {
        setCurrentMessage(messages.greeting);
        setHasStarted(true);
        speakMessage(messages.greeting);
        // Show skip button after greeting
        setTimeout(() => setShowSkipButton(true), 2000);
        // Auto transition to waiting state
        setTimeout(() => {
          const waitingMsg = messages.waiting;
          setCurrentMessage(waitingMsg);
          speakMessage(waitingMsg);
        }, 4000);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasStarted]);

  const handleVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Voice not supported",
        description: "Please use text input instead.",
        variant: "destructive"
      });
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak now!"
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
        variant: "destructive"
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleUserInput = async (input: string) => {
    const lowerInput = input.toLowerCase().trim();
    
    if (waitingForPassword) {
      // Check if password is correct
      if (lowerInput === 'rakhi2025' || lowerInput === 'rakhi 2025') {
        const responseMessage = messages.unlocked;
        setCurrentMessage(responseMessage);
        speakMessageWithElevenLabs(responseMessage);
        onPasswordUnlock?.(input);
        setWaitingForPassword(false);
      } else {
        const responseMessage = "Hmm, that doesn't seem right. Check your physical gift box carefully - the password should be written inside! Look for any special cards or notes. 🎁";
        setCurrentMessage(responseMessage);
        speakMessageWithElevenLabs(responseMessage);
      }
    } else if (lowerInput.includes('password') || lowerInput.includes('i have the password')) {
      const responseMessage = messages.passwordPrompt;
      setCurrentMessage(responseMessage);
      speakMessageWithElevenLabs(responseMessage);
      setWaitingForPassword(true);
    } else {
      // Use AI for natural conversation
      setIsLoading(true);
      try {
        const userMessage: ChatMessage = { role: 'user', content: input };
        const conversation = [
          {
            role: 'system' as const,
            content: "You are Skippy, a friendly study assistant bunny. You're helping someone unlock a special Raksha Bandhan surprise study dashboard. Guide them to check their physical gift box for the password - DO NOT reveal the actual password. Be helpful, cheerful, and encourage them to look for clues in their real gift. Keep responses short and engaging. Never mention 'rakhi2025' directly."
          },
          ...chatHistory,
          userMessage
        ];
        
        const response = await callAzureOpenAI(conversation);
        setChatHistory(prev => [...prev, userMessage, { role: 'assistant', content: response }]);
        setCurrentMessage(response);
        speakMessageWithElevenLabs(response);
      } catch (error) {
        const fallbackMessage = "I'm excited to help you study! But first, you need to unlock me. Do you have the password? 🔐";
        setCurrentMessage(fallbackMessage);
        speakMessageWithElevenLabs(fallbackMessage);
      } finally {
        setIsLoading(false);
      }
    }
    
    setInputText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      handleUserInput(inputText);
    }
  };

  const skipInstructions = () => {
    setCurrentMessage(messages.waiting);
    setShowSkipButton(false);
  };

  const speakMessage = (message: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.8; // Slower for better clarity
      utterance.pitch = 1.1;
      utterance.volume = 1.0; // Full volume
      
      // Wait for voices to load
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          const voices = window.speechSynthesis.getVoices();
          const femaleVoice = voices.find(voice => 
            voice.name.includes('Female') || 
            voice.name.includes('Google UK English Female') ||
            voice.name.includes('Microsoft Zira')
          );
          if (femaleVoice) utterance.voice = femaleVoice;
          window.speechSynthesis.speak(utterance);
        };
      } else {
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(voice => 
          voice.name.includes('Female') || 
          voice.name.includes('Google UK English Female') ||
          voice.name.includes('Microsoft Zira')
        );
        if (femaleVoice) utterance.voice = femaleVoice;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

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
      console.error('Voice synthesis error:', error);
      speakMessage(message); // Fallback to built-in speech
    }
  };

  const replayMessage = () => {
    speakMessage(currentMessage);
    toast({
      title: "Skippy says:",
      description: currentMessage
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative z-10 px-4">
      {/* Speech Bubble */}
      {currentMessage && (
        <Card className="speech-bubble max-w-md mb-8 animate-fade-in cyber-glow">
          <div className="p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <p className="text-foreground leading-relaxed">{currentMessage}</p>
              {isLoading && (
                <div className="flex items-center gap-1 ml-2">
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                placeholder={waitingForPassword ? "Enter the password..." : "Type your message..."}
                className="flex-1"
                disabled={isListening || isLoading}
              />
              <Button type="submit" size="icon" disabled={!inputText.trim() || isLoading}>
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
                <Mic className={`w-4 h-4 mr-2 ${isListening ? 'animate-pulse' : ''}`} />
                {isListening ? 'Listening...' : 'Voice Input'}
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
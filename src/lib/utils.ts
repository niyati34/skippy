import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useEffect, useState } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SkippyMessages = {
  WELCOME:
    "Hi! I'm Skippy, your AI study buddy! 🐰✨ Welcome to your personalized learning dashboard. I'm here to make your studies engaging and fun!",
  READY:
    "I'm ready to help you with your studies! What would you like to work on today?",
  ENCOURAGEMENT:
    "You're doing great! Keep up the excellent work. Remember, every small step brings you closer to your goals! 🌟",
  GREETING:
    "Hi! I'm Skippy, your secret study buddy! 🐰✨ You've received a special surprise—but you'll need to unlock me first!",
  WAITING: "I'm waiting for your command. You can speak to me or type below!",
  UNLOCKED:
    "Perfect! Welcome to your personalized study dashboard! Let's make your studies fun! 🎓",
};

interface UseAutoSpeechProps {
  text: string;
  autoStart?: boolean;
  delay?: number;
  rate?: number;
  volume?: number;
  voice?: string;
}

interface UseAutoSpeechReturn {
  speakNow: (customText?: string) => void;
  stopSpeaking: () => void;
  isSupported: boolean;
  isSpeaking: boolean;
}

export function useAutoSpeech({
  text,
  autoStart = false,
  delay = 1000,
  rate = 1,
  volume = 1,
  voice = "female",
}: UseAutoSpeechProps): UseAutoSpeechReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    setIsSupported("speechSynthesis" in window);
  }, []);

  const selectVoice = () => {
    if (!("speechSynthesis" in window)) return null;

    const voices = window.speechSynthesis.getVoices();

    // Prefer Google or Microsoft voices for better quality
    const preferredVoice =
      voices.find(
        (v) =>
          v.name.includes("Google US English") ||
          v.name.includes("Microsoft Zira") ||
          (v.lang.includes("en-US") && v.name.includes("Google"))
      ) ||
      voices.find(
        (v) =>
          v.lang.includes("en-US") && v.name.toLowerCase().includes("female")
      ) ||
      voices.find((v) => v.lang.includes("en-US")) ||
      voices[0];

    return preferredVoice;
  };

  const speakNow = (customText?: string) => {
    if (!isSupported) return;

    const textToSpeak = customText || text;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    // Wait for voices to load
    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = rate;
      utterance.volume = volume;
      utterance.pitch = 1.1;

      const selectedVoice = selectVoice();
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      speak();
    } else {
      window.speechSynthesis.onvoiceschanged = speak;
    }
  };

  const stopSpeaking = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (autoStart && isSupported) {
      const timer = setTimeout(() => {
        speakNow();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isSupported, delay]);

  // Additional effect to ensure speech works on page refresh
  useEffect(() => {
    if (autoStart && isSupported) {
      // Force voice loading on page load/refresh
      const ensureVoicesLoaded = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          // Voices not loaded yet, wait for them
          window.speechSynthesis.onvoiceschanged = () => {
            setTimeout(() => speakNow(), delay);
          };
        } else {
          // Voices already loaded, speak after delay
          setTimeout(() => speakNow(), delay);
        }
      };

      // Small delay to ensure page is fully loaded
      const initTimer = setTimeout(ensureVoicesLoaded, 500);
      return () => clearTimeout(initTimer);
    }
  }, []);

  return {
    speakNow,
    stopSpeaking,
    isSupported,
    isSpeaking,
  };
}

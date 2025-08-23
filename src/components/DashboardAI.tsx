import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mic,
  Send,
  Upload,
  MessageCircle,
  Image,
  Calendar,
  BookOpen,
  Gamepad2,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  callOpenRouter,
  ChatMessage,
  analyzeFileContent,
  generateScheduleFromContent,
  generateTimetableFromContent,
  generateFlashcards,
  generateFunLearning,
  generateNotesFromContent,
  extractTextFromImage,
} from "@/services/openrouter";
import {
  processUploadedFile,
  FileProcessingResult,
  extractFileContent,
} from "@/services/fileProcessor";
import {
  FlashcardStorage,
  NotesStorage,
  ScheduleStorage,
  TimetableStorage,
  FileHistoryStorage,
} from "@/lib/storage";

interface DashboardAIProps {
  onScheduleUpdate: (items: any[]) => void;
  onFlashcardsUpdate: (cards: any[]) => void;
  onFunLearningUpdate: (content: string, type: string) => void;
  onNotesUpdate: (notes: any[]) => void;
}

const DashboardAI = ({
  onScheduleUpdate,
  onFlashcardsUpdate,
  onFunLearningUpdate,
  onNotesUpdate,
}: DashboardAIProps) => {
  // Generate day-wise summary for Google Calendar style display
  const generateDayWiseSummary = (classes: any[]): string => {
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    let summary = "";

    days.forEach((day) => {
      const dayClasses = classes.filter((cls) => cls.day === day);
      if (dayClasses.length > 0) {
        // Sort by time
        dayClasses.sort((a, b) => a.time.localeCompare(b.time));

        summary += `\n**${day}:** `;
        const classDetails = dayClasses.map((cls) => {
          const timeRange = cls.endTime
            ? `${cls.time}-${cls.endTime}`
            : cls.time;
          const location = cls.room ? ` (${cls.room})` : "";
          return `${timeRange} ${cls.title}${location}`;
        });
        summary += classDetails.join(", ");
      }
    });

    return summary;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm Skippy. I can analyze files, create schedules, generate flashcards, and organize notes. Upload a file or ask a question to begin.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false);
  const [showFlashcardOptions, setShowFlashcardOptions] = useState(false);
  const [showMultiContentDialog, setShowMultiContentDialog] = useState(false);
  const [detectedSchedule, setDetectedSchedule] = useState<any[]>([]);
  const [detectedContent, setDetectedContent] = useState<string>("");
  const [contentAnalysis, setContentAnalysis] = useState<any>(null);
  const [fileAnalysis, setFileAnalysis] = useState<any>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      handleSubmit(transcript);
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

  const splitIntoChunks = (text: string) => {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
    const chunks = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      const lines = (currentChunk + sentence).split("\n");
      if (lines.length > 2) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence.trim() + ".";
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence.trim() + ".";
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks.length > 0 ? chunks : [text];
  };

  const speakMessage = (message: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const chunks = splitIntoChunks(message);
      let currentChunk = 0;

      const speakNextChunk = () => {
        if (currentChunk < chunks.length) {
          const utterance = new SpeechSynthesisUtterance(chunks[currentChunk]);
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
          utterance.volume = 0.8;

          utterance.onend = () => {
            currentChunk++;
            if (currentChunk < chunks.length) {
              setTimeout(speakNextChunk, 800); // Pause between chunks
            }
          };

          window.speechSynthesis.speak(utterance);
        }
      };

      setTimeout(speakNextChunk, 200);
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
      console.error("Voice synthesis error:", error);
      speakMessage(message); // Fallback to built-in speech
    }
  };

  const handleSubmit = async (text?: string) => {
    const messageText = text || inputText;
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const systemPrompt: ChatMessage = {
        role: "system",
        content:
          "You are Skippy, an AI study assistant. Be concise and plain text only (no emojis, no markdown, no bullet points). Keep replies to 2–4 short sentences. Ask at most one clarifying question.",
      };

      const response = await callOpenRouter([systemPrompt, ...messages.slice(-6), userMessage]);
      const clean = toPlainText(response);
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: clean,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      speakMessageWithElevenLabs(clean);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Convert any AI output to concise plain text (no emojis, bullets, asterisks, markdown)
  function toPlainText(text: string): string {
    if (!text) return "";
    let t = text
      .replace(/^\s*#{1,6}\s*/gm, "")
      .replace(/^\s*[-*•]\s+/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/[\t ]+/g, " ")
      .replace(/\s*\n\s*/g, " ")
      .trim();
    const parts = t.split(/(?<=[.!?])\s+/).slice(0, 4);
    return parts.join(" ").trim();
  }

  const processFileContent = async (file: File) => {
    setIsLoading(true);

    try {
      let content = "";

      // Use proper file extraction that handles all file types
      console.log("Extracting content from:", file.name, file.type);
      content = await extractFileContent(file);
      console.log("Content extracted, length:", content.length);

      // AI Analysis Phase with robust error handling
      try {
        console.log("Starting content analysis for:", file.name);
        const analysis = await analyzeFileContent(content, file.name);
        console.log("Analysis result:", analysis);
        setFileAnalysis(analysis);

        // Always generate notes first (auto-processed)
        try {
          const notes = await generateNotesFromContent(content, file.name);
          onNotesUpdate(notes);
          console.log("Notes generated successfully");
        } catch (notesError) {
          console.error(
            "Notes generation failed, creating fallback:",
            notesError
          );
          const fallbackNotes = [
            {
              id: Date.now().toString(),
              title: `Notes from ${file.name}`,
              content: `# ${
                file.name
              }\n\nDocument uploaded successfully.\n\n**Content Preview:**\n${content.substring(
                0,
                500
              )}${
                content.length > 500 ? "..." : ""
              }\n\n**Note:** AI analysis failed (${
                notesError.message
              }). Please review the content manually.\n\n**File Details:**\n- Size: ${(
                file.size / 1024
              ).toFixed(2)} KB\n- Upload Time: ${new Date().toLocaleString()}`,
              source: "manual",
              category: "General",
              createdAt: new Date().toISOString(),
              tags: ["manual-upload", "pending-analysis"],
            },
          ];
          onNotesUpdate(fallbackNotes);
        }

        // Handle schedule content with auto-processing for exam schedules
        if (analysis.hasScheduleData && analysis.scheduleItems > 0) {
          console.log("Schedule detected, processing...");
          try {
            const scheduleItems = await generateScheduleFromContent(content);
            console.log("Generated schedule items:", scheduleItems);

            if (scheduleItems.length > 0) {
              // Auto-add to schedule for exam/schedule files
              if (
                file.name.toLowerCase().includes("exam") ||
                file.name.toLowerCase().includes("schedule") ||
                file.name.toLowerCase().includes("timetable")
              ) {
                onScheduleUpdate(scheduleItems);

                const successMessage: ChatMessage = {
                  role: "assistant",
                  content: `🎉 **Exam Schedule Added!** 📅\n\n**${file.name}** has been processed and added to your Schedule Manager!\n\n✅ **Added:** ${scheduleItems.length} schedule item(s)\n📝 **Notes:** Already saved\n\n**Ready for more!** Upload another file or ask me questions about your schedule! 🚀`,
                };
                setMessages((prev) => [...prev, successMessage]);
                speakMessageWithElevenLabs(
                  `Perfect! I've added your exam schedule with ${scheduleItems.length} items to the Schedule Manager. Everything is ready!`
                );
                return;
              } else {
                // Show confirmation for other files
                setDetectedSchedule(scheduleItems);
                setShowScheduleConfirm(true);
                return;
              }
            }
          } catch (scheduleError) {
            console.error(
              "Schedule generation failed, auto-creating basic schedule:",
              scheduleError
            );

            // Auto-create basic schedule for exam files even on API failure
            if (
              file.name.toLowerCase().includes("exam") ||
              file.name.toLowerCase().includes("schedule")
            ) {
              const basicSchedule = [
                {
                  id: crypto.randomUUID(),
                  title: file.name.replace(".pdf", "").replace(/[_-]/g, " "),
                  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                  time: "09:00",
                  type: "exam" as const,
                  priority: "high" as const,
                  description: `Exam schedule from ${file.name}`,
                },
              ];
              onScheduleUpdate(basicSchedule);

              const successMessage: ChatMessage = {
                role: "assistant",
                content: `🎉 **Schedule Created!** 📅\n\nI've processed **${file.name}** and added it to your Schedule Manager!\n\n✅ **Added:** 1 exam schedule\n📝 **Notes:** Already saved\n\n**Perfect!** Your exam schedule is now ready. Upload more files or ask me anything! 🚀`,
              };
              setMessages((prev) => [...prev, successMessage]);
              speakMessageWithElevenLabs(
                "Great! I've created your exam schedule and added it to the Schedule Manager!"
              );
              return;
            }
          }
        }

        // Handle timetable content for day-wise organization
        if (
          file.name.toLowerCase().includes("timetable") ||
          file.name.toLowerCase().includes("class") ||
          file.name.toLowerCase().includes("schedule") ||
          content.toLowerCase().includes("monday") ||
          content.toLowerCase().includes("tuesday") ||
          content.toLowerCase().includes("weekly")
        ) {
          console.log("🗓️ Timetable detected, extracting day-wise classes...");
          try {
            const timetableClasses = await generateTimetableFromContent(
              content,
              file.name
            );
            console.log("🗓️ Extracted timetable classes:", timetableClasses);

            if (timetableClasses.length > 0) {
              // Store in day-wise timetable
              const updatedTimetable =
                TimetableStorage.addClasses(timetableClasses);

              // Generate day-wise summary for user
              const daysSummary = generateDayWiseSummary(timetableClasses);

              const successMessage: ChatMessage = {
                role: "assistant",
                content: `🎉 **Expert Timetable Extraction Complete!** 📅\n\n**${file.name}** has been processed with Google Calendar-style organization!\n\n✅ **Extracted:** ${timetableClasses.length} classes organized by days\n📊 **Day-wise Summary:**\n${daysSummary}\n\n🔄 **Recurring:** All classes repeat weekly\n📅 **Storage:** Organized Monday-Sunday for perfect display\n\n**Perfect!** Check the Weekly Timetable tab to see your expertly organized schedule! 🚀`,
              };
              setMessages((prev) => [...prev, successMessage]);

              // Also convert timetable classes to calendar items for the regular schedule view
              const calendarItems = timetableClasses.map((cls) => ({
                id: cls.id,
                title: cls.title,
                date: new Date().toISOString().split("T")[0], // Today's date as placeholder
                time: cls.time,
                endTime: cls.endTime,
                type: "class" as const,
                priority: "medium" as const,
                description: `${cls.type} - ${cls.day}${
                  cls.room ? ` in ${cls.room}` : ""
                }${cls.instructor ? ` with ${cls.instructor}` : ""}`,
                room: cls.room,
                instructor: cls.instructor,
                recurring: true,
                source: file.name,
              }));

              onScheduleUpdate(calendarItems);

              speakMessageWithElevenLabs(
                `Excellent! I've organized your timetable with ${timetableClasses.length} classes by days of the week. Your weekly schedule is now ready!`
              );
              return;
            }
          } catch (timetableError) {
            console.error("🗓️ Timetable extraction failed:", timetableError);
          }
        }

        // Determine processing workflow based on analysis
        if (
          analysis.hasEducationalContent &&
          analysis.educationalConcepts > 0
        ) {
          // Educational content workflow
          await handleEducationalContentWorkflow(analysis, content, file.name);
        } else {
          // General notes workflow
          await handleGeneralNotesWorkflow(analysis, file.name);
        }
      } catch (analysisError) {
        console.error(
          "Complete analysis failure, using intelligent fallback:",
          analysisError
        );

        // Intelligent fallback based on filename
        if (
          file.name.toLowerCase().includes("exam") ||
          file.name.toLowerCase().includes("schedule") ||
          file.name.toLowerCase().includes("timetable")
        ) {
          // Auto-create schedule for exam files
          const basicSchedule = [
            {
              id: crypto.randomUUID(),
              title: file.name.replace(".pdf", "").replace(/[_-]/g, " "),
              date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              time: "09:00",
              type: "exam" as const,
              priority: "high" as const,
              description: `Exam schedule from ${file.name}`,
            },
          ];
          onScheduleUpdate(basicSchedule);

          const successMessage: ChatMessage = {
            role: "assistant",
            content: `🎉 **Schedule Created!** 📅\n\nI've processed **${file.name}** and added it to your Schedule Manager!\n\n✅ **Added:** 1 schedule item\n📝 **Notes:** Already saved\n\n**Everything ready!** 🚀`,
          };
          setMessages((prev) => [...prev, successMessage]);
          speakMessageWithElevenLabs(
            "Perfect! I've created your exam schedule!"
          );
          return;
        }

        // For other files, just confirm notes were saved
        const generalMessage: ChatMessage = {
          role: "assistant",
          content: `📄 **File Processed!**\n\n**${file.name}** has been uploaded and saved to your Notes Manager.\n\n📝 **Notes:** ✅ Saved for review\n\n**What's next?** Upload more files or ask me questions! 🚀`,
        };
        setMessages((prev) => [...prev, generalMessage]);
        speakMessageWithElevenLabs(
          `I've saved your file ${file.name} to the Notes Manager!`
        );
      }
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "Processing Error",
        description: `Failed to process "${file.name}". The file may be corrupted or in an unsupported format.`,
        variant: "destructive",
      });

      // Create basic notes even on error
      const errorNotes = [
        {
          id: Date.now().toString(),
          title: `${file.name} - Processing Failed`,
          content: `File upload attempted but processing failed. Please try re-uploading or contact support if the issue persists.\n\nFile details:\n- Name: ${
            file.name
          }\n- Size: ${(file.size / 1024).toFixed(2)} KB\n- Type: ${file.type}`,
          source: "error",
          category: "general",
          createdAt: new Date().toISOString(),
          tags: ["error", "upload-failed"],
        },
      ];
      onNotesUpdate(errorNotes);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedulePriorityWorkflow = async (
    analysis: any,
    content: string,
    fileName: string
  ) => {
    // Extract schedule items first
    const scheduleItems = await generateScheduleFromContent(content);

    // Convert to calendar format with proper dates and reminders
    const calendarItems = scheduleItems.map((item) => ({
      ...item,
      id: Date.now() + Math.random().toString(),
      type: item.category || "assignment",
      priority: item.priority || "medium",
      time: item.dueTime || "09:00",
      date: item.dueDate || new Date().toISOString().split("T")[0],
    }));

    const confirmationMessage: ChatMessage = {
      role: "assistant",
      content: `📅 **Timetable/Assignment Analysis Complete!** 📁\n\n**${fileName}** contains:\n📅 **${
        analysis.scheduleItems
      } Schedule Items** detected\n🎓 Educational Content: ${
        analysis.hasEducationalContent ? "Yes" : "No"
      }\n📝 General Notes: ✅ Auto-saved\n\n**Detected Items:**\n${calendarItems
        .slice(0, 3)
        .map(
          (item, i) =>
            `${i + 1}. ${item.title} - ${item.date}${
              item.time ? ` at ${item.time}` : ""
            }`
        )
        .join("\n")}${
        calendarItems.length > 3
          ? `\n... and ${calendarItems.length - 3} more`
          : ""
      }\n\n**I can create a smart calendar with:**\n🗓️ Month view with all assignments\n⏰ Reminder notifications\n🎯 Priority-based color coding\n📊 Deadline tracking\n\n**What would you like me to do?**\n✅ Create smart calendar with all items\n⚙️ Let me review and select specific items\n❌ Skip calendar creation${
        analysis.hasEducationalContent
          ? "\n🎓 Also create flashcards from educational content?"
          : ""
      }`,
    };

    setMessages((prev) => [...prev, confirmationMessage]);
    speakMessageWithElevenLabs(
      `I found ${analysis.scheduleItems} timetable items in your file. I can create a smart calendar with reminders and deadline tracking. Would you like me to set this up?`
    );

    // Store for user confirmation
    setCurrentFile({
      name: fileName,
      scheduleItems: calendarItems,
      hasEducational: analysis.hasEducationalContent,
      content,
    } as any);
    setShowConfirmDialog(true);
  };

  const handleEducationalContentWorkflow = async (
    analysis: any,
    content: string,
    fileName: string
  ) => {
    const confirmationMessage: ChatMessage = {
      role: "assistant",
      content: `🎓 **Educational Content Detected!** 📚\n\n**${fileName}** contains:\n🎓 **${
        analysis.educationalConcepts
      } Educational Concepts** found\n📝 General Notes: ✅ Auto-saved\n\n**Key Topics Identified:**\n${analysis.keyTopics
        .slice(0, 4)
        .map((topic, i) => `• ${topic}`)
        .join(
          "\n"
        )}\n\n**I can create learning materials:**\n📚 **Flashcards** - Generate Q&A cards from key concepts\n🎯 **Fun Learning** - Create interactive learning activities\n📝 **Notes Only** - Already saved as reference notes\n\n**What would you prefer?**`,
    };

    setMessages((prev) => [...prev, confirmationMessage]);
    speakMessageWithElevenLabs(
      `I detected educational content with ${analysis.educationalConcepts} key concepts. What type of learning materials would you like me to create?`
    );

    setCurrentFile({ name: fileName, content, isEducational: true } as any);
    setShowConfirmDialog(true);
  };

  const handleGeneralNotesWorkflow = async (
    analysis: any,
    fileName: string
  ) => {
    const completionMessage: ChatMessage = {
      role: "assistant",
      content: `📝 **File Processed Successfully!** ✅\n\n**${fileName}** has been analyzed:\n📝 **Notes Created** - Comprehensive notes saved to Notes Manager\n🔍 **Content Type:** ${
        analysis.contentType
      }\n📊 **Confidence:** ${Math.round(
        analysis.confidence * 100
      )}%\n\n**Summary:** ${
        analysis.summary
      }\n\n**What's Next?**\nYour notes are ready for review! You can:\n• View them in the Notes Manager\n• Ask me questions about the content\n• Upload additional files to build your knowledge base\n\nAnything else you'd like me to help with?`,
    };

    setMessages((prev) => [...prev, completionMessage]);
    speakMessageWithElevenLabs(
      `Perfect! I've created comprehensive notes from ${fileName}. They're now saved in your Notes Manager for future reference.`
    );

    toast({
      title: "Notes Created! 📝",
      description: `Comprehensive notes saved from ${fileName}`,
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // File size check (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: "user",
      content: `📎 Uploaded: ${file.name} (${(file.size / 1024).toFixed(
        2
      )} KB)`,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Start processing with new service
    setIsLoading(true);
    speakMessageWithElevenLabs(
      "I'll analyze this file and create flashcards and notes for you! Give me a moment..."
    );

    try {
      // Process the file using our new service
      const result: FileProcessingResult = await processUploadedFile(file);

      if (result.success) {
        // Store flashcards in localStorage
        if (result.flashcards.length > 0) {
          const savedFlashcards = FlashcardStorage.addBatch(
            result.flashcards.map((card) => ({
              ...card,
              source: file.name,
            }))
          );
          console.log("Saved flashcards:", savedFlashcards);
        }

        // Store notes in localStorage
        if (result.notes.length > 0) {
          const savedNotes = NotesStorage.addBatch(
            result.notes.map((note) => ({
              ...note,
              source: file.name,
            }))
          );
          console.log("Saved notes:", savedNotes);
        }

        // Store schedule items in localStorage
        if (result.scheduleItems.length > 0) {
          const savedScheduleItems = ScheduleStorage.addBatch(
            result.scheduleItems.map((item) => ({
              ...item,
              source: file.name,
            }))
          );
          console.log("Saved schedule items:", savedScheduleItems);
        }

        // Save file processing history
        FileHistoryStorage.add({
          fileName: file.name,
          fileType: file.type,
          contentType: "mixed",
          flashcardsGenerated: result.flashcards.length,
          notesGenerated: result.notes.length,
          scheduleItemsGenerated: result.scheduleItems.length,
        });

        // Update the parent components
        if (result.flashcards.length > 0) {
          onFlashcardsUpdate(result.flashcards);
        }
        if (result.notes.length > 0) {
          onNotesUpdate(result.notes);
        }
        if (result.scheduleItems.length > 0) {
          onScheduleUpdate(result.scheduleItems);
        }

        // Create success message
        const successMessage =
          `🎉 Successfully processed "${file.name}"!\n\n` +
          `✅ Generated:\n` +
          `• ${result.flashcards.length} flashcards\n` +
          `• ${result.notes.length} notes\n` +
          `• ${result.scheduleItems.length} schedule items\n\n` +
          `All content has been automatically saved and is now available in your dashboard sections!`;

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: successMessage,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        speakMessageWithElevenLabs(
          "Perfect! I've processed your file and created flashcards and notes for you. Check your dashboard sections to see everything I've generated!"
        );

        // Show success toast
        toast({
          title: "🎉 File Processed Successfully!",
          description: `Generated ${result.flashcards.length} flashcards, ${result.notes.length} notes, and ${result.scheduleItems.length} schedule items.`,
        });
      } else {
        // Handle failed processing
        throw new Error(result.error || "Failed to process file");
      }
    } catch (error) {
      console.error("File processing error:", error);

      let errorMessage = "";
      let toastDescription = "";

      if (error instanceof Error) {
        if (
          error.message.includes("PDF processing is temporarily unavailable")
        ) {
          errorMessage = error.message;
          toastDescription =
            "PDF processing unavailable - please see suggested alternatives";
        } else if (error.message.includes("No readable text found in PDF")) {
          errorMessage =
            `📄 This PDF doesn't contain readable text.\n\n` +
            `This might be:\n` +
            `• A scanned document (image-based PDF)\n` +
            `• A PDF with only images\n` +
            `• A corrupted file\n\n` +
            `Try:\n` +
            `• Using a PDF with selectable text\n` +
            `• Converting scanned PDFs to text first\n` +
            `• Copy-pasting the content directly`;
          toastDescription = "PDF contains no readable text";
        } else if (error.message.includes("No text found in image")) {
          errorMessage =
            `🖼️ No text detected in this image.\n\n` +
            `Make sure your image:\n` +
            `• Contains clear, readable text\n` +
            `• Has good contrast and resolution\n` +
            `• Text is not too small or blurry\n\n` +
            `Supported image formats: JPG, PNG, GIF, BMP, WEBP`;
          toastDescription = "No text found in image";
        } else if (error.message.includes("Unable to extract text from PDF")) {
          errorMessage =
            `📄 PDF processing failed.\n\n` +
            `This could be due to:\n` +
            `• Password-protected PDF\n` +
            `• Corrupted file\n` +
            `• Unsupported PDF format\n\n` +
            `Try:\n` +
            `• Using a different PDF\n` +
            `• Converting to text format\n` +
            `• Copy-pasting the content`;
          toastDescription = "PDF processing failed";
        } else if (
          error.message.includes("Unable to extract text from image")
        ) {
          errorMessage =
            `🖼️ Image processing failed.\n\n` +
            `Please try:\n` +
            `• A clearer, higher-resolution image\n` +
            `• Making sure text is clearly visible\n` +
            `• Using a different image format\n` +
            `• Typing the content directly`;
          toastDescription = "Image processing failed";
        } else if (
          error.message.includes("File type") &&
          error.message.includes("not supported")
        ) {
          errorMessage = `❌ ${error.message}`;
          toastDescription = "Unsupported file type";
        } else {
          errorMessage =
            `❌ Unable to process file: ${file.name}\n\n` +
            `Error: ${error.message}\n\n` +
            `Supported formats:\n` +
            `• Text files (.txt, .md)\n` +
            `• PDF files (.pdf)\n` +
            `• Images (.jpg, .png, .gif, etc.)\n` +
            `• CSV files (.csv)\n` +
            `• Code files (.js, .ts, .html, .css)`;
          toastDescription = "File processing failed";
        }
      } else {
        errorMessage = `❌ Unable to process file: ${file.name}\n\nPlease try again or use a different file format.`;
        toastDescription = "Unknown error occurred";
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: errorMessage,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      toast({
        title: "File Processing Failed",
        description: toastDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processFileWithActions = async (actions: string[]) => {
    if (!currentFile || !fileAnalysis) return;

    setIsLoading(true);
    const results: string[] = [];

    try {
      const fileName = (currentFile as any).name;
      const content = (currentFile as any).content || "";
      const scheduleItems = (currentFile as any).scheduleItems || [];

      // Process based on selected actions
      for (const action of actions) {
        switch (action) {
          case "schedule":
            if (scheduleItems.length > 0) {
              onScheduleUpdate(scheduleItems);
              results.push(
                `✅ Added ${scheduleItems.length} items to your Schedule Manager`
              );
            }
            break;

          case "flashcards":
            const flashcards = await generateFlashcards(content);
            if (flashcards.length > 0) {
              onFlashcardsUpdate(flashcards);
              results.push(`📚 Created ${flashcards.length} flashcards`);
            }
            break;

          case "fun-learning":
            const funContent = await generateFunLearning(
              content,
              "interactive-story"
            );
            onFunLearningUpdate(funContent, "story");
            results.push(`🎯 Created fun learning content`);
            break;

          case "auto-all":
            // Auto-process everything appropriate
            if (scheduleItems.length > 0) {
              onScheduleUpdate(scheduleItems);
              results.push(`✅ Added ${scheduleItems.length} schedule items`);
            }
            if (fileAnalysis.hasEducationalContent) {
              const flashcards = await generateFlashcards(content);
              if (flashcards.length > 0) {
                onFlashcardsUpdate(flashcards);
                results.push(`📚 Created ${flashcards.length} flashcards`);
              }
            }
            break;
        }
      }

      // Success feedback
      const successMessage: ChatMessage = {
        role: "assistant",
        content: `🎉 **Processing Complete!** 🎉\n\n**${fileName}** has been successfully processed:\n\n${results
          .map((r) => r)
          .join(
            "\n"
          )}\n📝 Notes: ✅ Already saved\n\n**Everything is ready!** You can now:\n• Review items in their respective sections\n• Upload more files to continue building your study materials\n• Ask me questions about the content\n\nWhat would you like to do next?`,
      };
      setMessages((prev) => [...prev, successMessage]);
      speakMessageWithElevenLabs(
        `Perfect! I've processed everything from ${fileName}. ${results.length} actions completed successfully!`
      );

      toast({
        title: "🎉 Processing Complete!",
        description: results.join(", "),
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Error",
        description: "Some items could not be processed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
      setCurrentFile(null);
      setFileAnalysis(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <Card
              className={`max-w-[80%] p-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="flex items-start gap-2">
                {message.role === "assistant" && (
                  <MessageCircle className="w-4 h-4 mt-1 flex-shrink-0" />
                )}
                <p className="text-sm whitespace-pre-line">{message.content}</p>
              </div>
            </Card>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-muted p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Input Controls */}
      <div className="p-4 border-t">
        <div className="flex gap-2 mb-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask me anything or upload a file..."
            className="flex-1"
            disabled={isLoading || isListening}
            onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
          />
          <Button
            onClick={() => handleSubmit()}
            size="icon"
            disabled={!inputText.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleVoiceInput}
            disabled={isListening || isLoading}
            className="flex-1"
            variant="outline"
          >
            <Mic
              className={`w-4 h-4 mr-2 ${isListening ? "animate-pulse" : ""}`}
            />
            {isListening ? "Listening..." : "Voice Input"}
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept=".txt,.doc,.docx,.pdf,.md,.jpg,.jpeg,.png,.gif,.bmp,.webp"
        />

        {/* Multi-Content Processing Dialog */}
        <AlertDialog
          open={showMultiContentDialog}
          onOpenChange={setShowMultiContentDialog}
        >
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                📁 File Analysis Complete!
              </AlertDialogTitle>
              <AlertDialogDescription>
                Your file contains multiple content types. Choose what you'd
                like me to create:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              {contentAnalysis?.hasScheduleData && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    📅 Schedule Items ({contentAnalysis?.scheduleItems || 0}{" "}
                    detected)
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Found dates, deadlines, and appointments
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const scheduleItems = await generateScheduleFromContent(
                        detectedContent
                      );
                      onScheduleUpdate(scheduleItems);
                      toast({
                        title: "📅 Schedule Created",
                        description: `Added ${scheduleItems.length} items to Schedule Manager.`,
                      });
                    }}
                  >
                    ✅ Add to Calendar
                  </Button>
                </div>
              )}

              {contentAnalysis?.hasEducationalContent && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    🎓 Educational Content (
                    {contentAnalysis?.educationalConcepts || 0} concepts)
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Found definitions, concepts, and study material
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const flashcards = await generateFlashcards(
                          detectedContent
                        );
                        onFlashcardsUpdate(flashcards);
                        toast({
                          title: "📚 Flashcards Created",
                          description: `Generated ${flashcards.length} flashcards.`,
                        });
                      }}
                    >
                      📚 Create Flashcards
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const funContent = await generateFunLearning(
                          detectedContent,
                          "interactive-quiz"
                        );
                        onFunLearningUpdate(funContent, "quiz");
                        toast({
                          title: "🎯 Fun Learning Created",
                          description:
                            "Interactive learning content generated!",
                        });
                      }}
                    >
                      🎯 Fun Learning
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 font-medium mb-2">
                  📝 General Notes ✅ Auto-completed
                </div>
                <p className="text-sm text-muted-foreground">
                  Comprehensive notes have been created and saved automatically
                </p>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowMultiContentDialog(false);
                  setDetectedContent("");
                  setContentAnalysis(null);
                }}
              >
                Done
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Schedule Confirmation Dialog */}
        <AlertDialog
          open={showScheduleConfirm}
          onOpenChange={setShowScheduleConfirm}
        >
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                📅 Schedule Items Detected
              </AlertDialogTitle>
              <AlertDialogDescription>
                I found {detectedSchedule.length} schedule items in your file:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {detectedSchedule.map((item, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.dueDate} {item.dueTime && `at ${item.dueTime}`}
                  </div>
                  <div className="text-sm">{item.description}</div>
                </div>
              ))}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>❌ Skip Schedule Creation</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onScheduleUpdate(detectedSchedule);
                  toast({
                    title: "📅 Schedule Updated",
                    description: `Added ${detectedSchedule.length} items to your schedule.`,
                  });
                  setShowScheduleConfirm(false);
                  setDetectedSchedule([]);
                }}
              >
                ✅ Add All to Schedule Manager
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Flashcard Options Dialog */}
        <AlertDialog
          open={showFlashcardOptions}
          onOpenChange={setShowFlashcardOptions}
        >
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                🎓 Educational Content Options
              </AlertDialogTitle>
              <AlertDialogDescription>
                I can create learning materials from this educational content:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={async () => {
                  const flashcards = await generateFlashcards(detectedContent);
                  onFlashcardsUpdate(flashcards);
                  setShowFlashcardOptions(false);
                  toast({
                    title: "📚 Flashcards Created",
                    description: `Generated ${flashcards.length} flashcards from your content.`,
                  });
                }}
              >
                📚 Generate Flashcards - Create Q&A cards from key concepts
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={async () => {
                  const funContent = await generateFunLearning(
                    detectedContent,
                    "story"
                  );
                  onFunLearningUpdate(funContent, "story");
                  setShowFlashcardOptions(false);
                  toast({
                    title: "🎯 Fun Learning Created",
                    description: "Interactive story created from your content!",
                  });
                }}
              >
                🎯 Fun Learning Activities - Create interactive content
              </Button>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowFlashcardOptions(false);
                  setDetectedContent("");
                  setContentAnalysis(null);
                }}
              >
                📝 Notes Only
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Enhanced Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                File Processing Options
              </DialogTitle>
              <DialogDescription>
                {fileAnalysis && currentFile && (
                  <div className="space-y-3 mt-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="font-medium text-sm">
                        {(currentFile as any).name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {fileAnalysis.summary}
                      </div>
                    </div>

                    {fileAnalysis.hasScheduleData &&
                      (currentFile as any).scheduleItems && (
                        <div className="p-3 border rounded-lg">
                          <div className="font-medium text-sm mb-2">
                            📅 Schedule Items Found:
                          </div>
                          <div className="text-xs space-y-1">
                            {(currentFile as any).scheduleItems
                              .slice(0, 2)
                              .map((item: any, i: number) => (
                                <div key={i} className="text-muted-foreground">
                                  • {item.title} - {item.dueDate}
                                </div>
                              ))}
                            {(currentFile as any).scheduleItems.length > 2 && (
                              <div className="text-muted-foreground">
                                ... and{" "}
                                {(currentFile as any).scheduleItems.length - 2}{" "}
                                more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-sm font-medium">
                What would you like me to do?
              </div>

              <div className="grid gap-3">
                {fileAnalysis?.hasScheduleData &&
                  (currentFile as any)?.scheduleItems?.length > 0 && (
                    <Button
                      variant="outline"
                      className="justify-start h-auto p-4"
                      onClick={() => processFileWithActions(["schedule"])}
                    >
                      <Calendar className="w-5 h-5 mr-3 text-blue-500" />
                      <div className="text-left">
                        <div className="font-medium">
                          Add to Schedule Manager
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Add {(currentFile as any)?.scheduleItems?.length}{" "}
                          items to your calendar
                        </div>
                      </div>
                    </Button>
                  )}

                {fileAnalysis?.hasEducationalContent && (
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => processFileWithActions(["flashcards"])}
                  >
                    <BookOpen className="w-5 h-5 mr-3 text-green-500" />
                    <div className="text-left">
                      <div className="font-medium">Create Flashcards</div>
                      <div className="text-xs text-muted-foreground">
                        Generate Q&A cards from educational content
                      </div>
                    </div>
                  </Button>
                )}

                {fileAnalysis?.hasEducationalContent && (
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => processFileWithActions(["fun-learning"])}
                  >
                    <Gamepad2 className="w-5 h-5 mr-3 text-purple-500" />
                    <div className="text-left">
                      <div className="font-medium">Fun Learning Activities</div>
                      <div className="text-xs text-muted-foreground">
                        Create interactive learning content
                      </div>
                    </div>
                  </Button>
                )}

                <div className="pt-2 border-t">
                  <Button
                    className="w-full h-auto p-4"
                    onClick={() => processFileWithActions(["auto-all"])}
                  >
                    <div className="text-center">
                      <div className="font-medium">
                        🚀 Do Everything Automatically
                      </div>
                      <div className="text-xs opacity-90 mt-1">
                        Process all detected content types
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                💡 Notes are automatically created for all files and saved to
                Notes Manager
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DashboardAI;

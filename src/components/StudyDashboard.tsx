import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Calendar,
  BookOpen,
  Target,
  Gamepad2,
  Menu,
  MessageCircle,
  FileText,
} from "lucide-react";
import CalendarView from "./CalendarView";
import WeeklyTimetableView from "./WeeklyTimetableView";
import ScheduleChart from "./ScheduleChart";
import FlashCardMaker from "./FlashCardMaker";
import FunLearning from "./FunLearning";
import DashboardAI from "./DashboardAI";
import NotesManager from "./NotesManager";

interface StudyDashboardProps {
  userName?: string;
}

const StudyDashboard = ({ userName = "Friend" }: StudyDashboardProps) => {
  const [activeTab, setActiveTab] = useState("ai-chat");
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [funLearningContent, setFunLearningContent] = useState<string>("");
  const [notes, setNotes] = useState<any[]>([]);

  const speakWelcomeMessage = async (message: string) => {
    try {
      // For now, use built-in speech synthesis as fallback
      // In production, you would integrate with ElevenLabs API here
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("Voice synthesis error:", error);
    }
  };

  useEffect(() => {
    // Welcome message when dashboard opens
    const welcomeMessage = `Hey there, ${userName}! I'm Skippy! 🐰 I can help you generate schedules, flashcards, and even fun stories! What do you want to do today?`;
    setTimeout(() => {
      speakWelcomeMessage(welcomeMessage);
    }, 1000);
  }, [userName]);

  return (
    <div className="min-h-screen bg-background relative z-10">
      <div className="flex">
        {/* Mobile Hamburger Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed top-4 left-4 z-50 md:hidden"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Study Tools</h2>
                <p className="text-sm text-muted-foreground">
                  Choose your study assistant
                </p>
              </div>
              <nav className="space-y-2">
                <Button
                  variant={activeTab === "ai-chat" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("ai-chat")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat with Skippy
                </Button>
                <Button
                  variant={activeTab === "schedule" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("schedule")}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Manager
                </Button>
                <Button
                  variant={activeTab === "flashcards" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("flashcards")}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Flash Cards
                </Button>
                <Button
                  variant={activeTab === "fun" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("fun")}
                >
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Fun Learning
                </Button>
                <Button
                  variant={activeTab === "notes" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("notes")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Notes Manager
                </Button>
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <div className="flex flex-col flex-1 min-h-0 bg-card border-r border-border">
            <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 mb-8">
                <div className="text-center w-full">
                  <h1 className="text-xl font-bold cyber-text-glow">
                    Study Dashboard 🎓
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Let's make learning fun, {userName}!
                  </p>
                </div>
              </div>
              <nav className="flex-1 px-4 space-y-2">
                <Button
                  variant={activeTab === "ai-chat" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("ai-chat")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat with Skippy
                </Button>
                <Button
                  variant={activeTab === "schedule" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("schedule")}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Manager
                </Button>
                <Button
                  variant={activeTab === "flashcards" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("flashcards")}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Flash Cards
                </Button>
                <Button
                  variant={activeTab === "fun" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("fun")}
                >
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Fun Learning
                </Button>
                <Button
                  variant={activeTab === "notes" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("notes")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Notes Manager
                </Button>
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col flex-1 md:pl-64">
          <main className="flex-1">
            <div className="py-6 px-4 sm:px-6 lg:px-8">
              {activeTab === "ai-chat" && (
                <Card className="h-[calc(100vh-8rem)] cyber-glow">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-primary" />
                      Skippy AI Assistant
                    </CardTitle>
                    <CardDescription>
                      Chat with Skippy to organize your studies, upload files,
                      and get instant help
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-6rem)] p-0">
                    <DashboardAI
                      onScheduleUpdate={(items) =>
                        setScheduleItems((prev) => [...prev, ...items])
                      }
                      onFlashcardsUpdate={(cards) =>
                        setFlashcards((prev) => [...prev, ...cards])
                      }
                      onFunLearningUpdate={(content, type) =>
                        setFunLearningContent(content)
                      }
                      onNotesUpdate={(newNotes) =>
                        setNotes((prev) => [...prev, ...newNotes])
                      }
                    />
                  </CardContent>
                </Card>
              )}

              {activeTab === "schedule" && (
                <WeeklyTimetableView
                  items={scheduleItems.map((item) => ({
                    ...item,
                    priority: "medium" as const,
                    recurring: true,
                  }))}
                  onItemsUpdate={(items) => setScheduleItems(items)}
                />
              )}

              {activeTab === "flashcards" && (
                <FlashCardMaker flashcards={flashcards} />
              )}

              {activeTab === "fun" && (
                <FunLearning content={funLearningContent} />
              )}

              {activeTab === "notes" && <NotesManager notes={notes} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudyDashboard;

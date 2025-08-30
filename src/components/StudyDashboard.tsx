import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Calendar,
  BookOpen,
  Gamepad2,
  Menu,
  MessageCircle,
  FileText,
} from "lucide-react";
import WeeklyTimetableView from "./WeeklyTimetableView";
import FlashCardMaker from "./FlashCardMaker";
import FunLearning from "./FunLearning";
import DashboardAI from "./DashboardAI";
import NotesManager from "./NotesManager";
import { verifySession } from "@/lib/session";
import SessionBanner from "./SessionBanner";
import BuddyPreferences from "./BuddyPreferences";

interface StudyDashboardProps {
  userName?: string;
}

const StudyDashboard = ({ userName = "Friend" }: StudyDashboardProps) => {
  const [activeTab, setActiveTab] = useState("ai-chat");
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [funLearningContent, setFunLearningContent] = useState<string>("");
  const [notes, setNotes] = useState<any[]>([]);
  const [newCounts, setNewCounts] = useState({
    schedule: 0,
    flashcards: 0,
    notes: 0,
    fun: false,
  });

  const speakWelcomeMessage = async (message: string) => {
    try {
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
    const welcomeMessage = `Hey there, ${userName}! I'm Skippy! I can help you generate schedules, flashcards, and even fun stories! What do you want to do today?`;
    const t = setTimeout(() => speakWelcomeMessage(welcomeMessage), 1000);
    return () => clearTimeout(t);
  }, [userName]);

  // Load persisted counters on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("skippy:newCounts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed === "object" &&
          parsed &&
          ["schedule", "flashcards", "notes", "fun"].every((k) => k in parsed)
        ) {
          setNewCounts((c) => ({ ...c, ...parsed }));
        }
      }
    } catch {}
  }, []);

  // Persist counters whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("skippy:newCounts", JSON.stringify(newCounts));
    } catch {}
  }, [newCounts]);

  // Verify session in background
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await verifySession();
    })();
    const id = window.setInterval(async () => {
      if (!cancelled) await verifySession();
    }, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative z-10">
      <SessionBanner />
      <BuddyPreferences />
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
                  className="w-full justify-between"
                  onClick={() => setActiveTab("ai-chat")}
                >
                  <span className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat with Skippy
                  </span>
                </Button>
                <Button
                  variant={activeTab === "schedule" ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => {
                    setActiveTab("schedule");
                    setNewCounts((c) => ({ ...c, schedule: 0 }));
                  }}
                >
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Manager
                  </span>
                  {newCounts.schedule > 0 && (
                    <Badge variant="secondary">{newCounts.schedule}</Badge>
                  )}
                </Button>
                <Button
                  variant={activeTab === "flashcards" ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => {
                    setActiveTab("flashcards");
                    setNewCounts((c) => ({ ...c, flashcards: 0 }));
                  }}
                >
                  <span className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Flash Cards
                  </span>
                  {newCounts.flashcards > 0 && (
                    <Badge variant="secondary">{newCounts.flashcards}</Badge>
                  )}
                </Button>
                <Button
                  variant={activeTab === "fun" ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => {
                    setActiveTab("fun");
                    setNewCounts((c) => ({ ...c, fun: false }));
                  }}
                >
                  <span className="flex items-center">
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    Fun Learning
                  </span>
                  {newCounts.fun && <Badge variant="secondary">NEW</Badge>}
                </Button>
                <Button
                  variant={activeTab === "notes" ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => {
                    setActiveTab("notes");
                    setNewCounts((c) => ({ ...c, notes: 0 }));
                  }}
                >
                  <span className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Notes Manager
                  </span>
                  {newCounts.notes > 0 && (
                    <Badge variant="secondary">{newCounts.notes}</Badge>
                  )}
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
                  className="w-full justify-between"
                  onClick={() => setActiveTab("ai-chat")}
                >
                  <span className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat with Skippy
                  </span>
                </Button>
                <Button
                  variant={activeTab === "schedule" ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => {
                    setActiveTab("schedule");
                    setNewCounts((c) => ({ ...c, schedule: 0 }));
                  }}
                >
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Manager
                  </span>
                  {newCounts.schedule > 0 && (
                    <Badge variant="secondary">{newCounts.schedule}</Badge>
                  )}
                </Button>
                <Button
                  variant={activeTab === "flashcards" ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => {
                    setActiveTab("flashcards");
                    setNewCounts((c) => ({ ...c, flashcards: 0 }));
                  }}
                >
                  <span className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Flash Cards
                  </span>
                  {newCounts.flashcards > 0 && (
                    <Badge variant="secondary">{newCounts.flashcards}</Badge>
                  )}
                </Button>
                <Button
                  variant={activeTab === "fun" ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => {
                    setActiveTab("fun");
                    setNewCounts((c) => ({ ...c, fun: false }));
                  }}
                >
                  <span className="flex items-center">
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    Fun Learning
                  </span>
                  {newCounts.fun && <Badge variant="secondary">NEW</Badge>}
                </Button>
                <Button
                  variant={activeTab === "notes" ? "default" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => {
                    setActiveTab("notes");
                    setNewCounts((c) => ({ ...c, notes: 0 }));
                  }}
                >
                  <span className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Notes Manager
                  </span>
                  {newCounts.notes > 0 && (
                    <Badge variant="secondary">{newCounts.notes}</Badge>
                  )}
                </Button>
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col flex-1 md:pl-64 h-screen">
          <main className="flex-1 h-full">
            <div className="h-full">
              {activeTab === "ai-chat" && (
                <Card className="h-full">
                  <CardContent className="h-full p-0">
                    <DashboardAI
                      onScheduleUpdate={(items) => {
                        setScheduleItems((prev) => [...prev, ...items]);
                        setNewCounts((c) => ({
                          ...c,
                          schedule: c.schedule + (items?.length || 0),
                        }));
                      }}
                      onFlashcardsUpdate={(cards) => {
                        setFlashcards((prev) => [...prev, ...cards]);
                        setNewCounts((c) => ({
                          ...c,
                          flashcards: c.flashcards + (cards?.length || 0),
                        }));
                      }}
                      onFunLearningUpdate={(content, type) => {
                        setFunLearningContent(content);
                        setNewCounts((c) => ({ ...c, fun: true }));
                      }}
                      onNotesUpdate={(newNotes) => {
                        setNotes((prev) => [...prev, ...newNotes]);
                        setNewCounts((c) => ({
                          ...c,
                          notes: c.notes + (newNotes?.length || 0),
                        }));
                      }}
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

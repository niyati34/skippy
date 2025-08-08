import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  Calendar,
  Tag,
  Trash2,
  Edit,
  Plus,
  ArrowLeft,
  BookOpen,
  Volume2,
  VolumeX,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Settings,
  Download,
  Share2,
  Brain,
  Sparkles,
  Headphones,
  Mic,
  Square,
  X,
} from "lucide-react";
import { NotesStorage, StoredNote } from "@/lib/storage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Note {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  createdAt: string;
  tags: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  readingTime?: number;
  keyPoints?: string[];
  summary?: string;
  audioEnabled?: boolean;
}

interface NotesManagerProps {
  notes?: Note[];
}

const NotesManager = ({ notes: externalNotes = [] }: NotesManagerProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentView, setCurrentView] = useState<
    "subjects" | "category" | "note"
  >("subjects");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    category: "General",
    tags: "",
  });

  // Enhanced Audio Features State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAudioNote, setCurrentAudioNote] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [audioVoice, setAudioVoice] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [studyMode, setStudyMode] = useState<"normal" | "focus" | "review">(
    "normal"
  );
  const [notesDifficulty, setNotesDifficulty] = useState<
    "all" | "beginner" | "intermediate" | "advanced"
  >("all");

  // Audio refs
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioSupported, setAudioSupported] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);

  // Initialize speech synthesis with better error handling
  useEffect(() => {
    const initializeSpeech = () => {
      console.log('Initializing speech synthesis...');
      
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speechSynthesisRef.current = window.speechSynthesis;
        setAudioSupported(true);
        console.log('Speech synthesis available');
        
        // Load voices
        const loadVoices = () => {
          if (!speechSynthesisRef.current) return;
          
          const voices = speechSynthesisRef.current.getVoices();
          console.log('Loading voices, found:', voices.length);
          
          if (voices.length > 0) {
            setVoicesLoaded(true);
            console.log('Voices loaded successfully:', voices.map(v => v.name));
            
            // Set default voice if not already set
            if (!audioVoice && voices.length > 0) {
              const englishVoice = voices.find(voice => 
                voice.lang.startsWith('en') && voice.localService
              ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
              
              if (englishVoice) {
                setAudioVoice(englishVoice.name);
                console.log('Default voice set to:', englishVoice.name);
              }
            }
          } else {
            console.log('No voices available yet');
          }
        };

        // Load voices immediately
        loadVoices();
        
        // Listen for voice changes (some browsers load voices asynchronously)
        if (speechSynthesisRef.current) {
          speechSynthesisRef.current.addEventListener('voiceschanged', loadVoices);
        }
        
        // Fallback: try loading voices after delays
        setTimeout(loadVoices, 500);
        setTimeout(loadVoices, 1500);
        setTimeout(loadVoices, 3000);
        
        // Prime the speech synthesis with a silent utterance (some browsers need this)
        const primeUtterance = new SpeechSynthesisUtterance('');
        primeUtterance.volume = 0;
        speechSynthesisRef.current.speak(primeUtterance);
        
        return () => {
          if (speechSynthesisRef.current) {
            speechSynthesisRef.current.removeEventListener('voiceschanged', loadVoices);
          }
        };
      } else {
        console.warn('Speech synthesis not supported in this browser');
        setAudioSupported(false);
      }
    };

    initializeSpeech();
  }, []);

  // Handle user interaction for audio permissions
  useEffect(() => {
    const handleFirstUserInteraction = () => {
      console.log('User interaction detected, enabling audio...');
      
      if (speechSynthesisRef.current && !audioPermissionGranted) {
        // Create a silent utterance to enable audio
        const silentUtterance = new SpeechSynthesisUtterance('');
        silentUtterance.volume = 0;
        silentUtterance.rate = 10; // Very fast
        
        silentUtterance.onend = () => {
          console.log('Audio permission granted through user interaction');
          setAudioPermissionGranted(true);
        };
        
        silentUtterance.onerror = (error) => {
          console.error('Error granting audio permission:', error);
        };
        
        speechSynthesisRef.current.speak(silentUtterance);
      }
    };

    if (!audioPermissionGranted) {
      document.addEventListener('click', handleFirstUserInteraction, { once: true });
      document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });
      
      return () => {
        document.removeEventListener('click', handleFirstUserInteraction);
        document.removeEventListener('touchstart', handleFirstUserInteraction);
      };
    }
  }, [audioPermissionGranted]);

  // Load notes from localStorage on component mount
  useEffect(() => {
    // Clean duplicates and load
    const cleanedNotes = NotesStorage.removeDuplicates();
    setNotes(cleanedNotes);
  }, []);

  useEffect(() => {
    if (externalNotes.length > 0) {
      setNotes((prev) => {
        // Check for duplicates by comparing titles and sources to avoid multiple additions
        const existingTitles = new Set(
          prev.map((note) => `${note.title}-${note.source}`)
        );
        const newNotes = externalNotes.filter(
          (note) => !existingTitles.has(`${note.title}-${note.source}`)
        );

        if (newNotes.length > 0) {
          // Save only new notes to localStorage
          NotesStorage.addBatch(newNotes);
          return [...prev, ...newNotes];
        }
        return prev;
      });
    }
  }, [externalNotes]);

  // Get unique subjects/categories with note counts
  const getSubjects = () => {
    const subjects = notes.reduce((acc, note) => {
      const category = note.category || "General";
      if (!acc[category]) {
        acc[category] = {
          name: category,
          count: 0,
          notes: [],
        };
      }
      acc[category].count++;
      acc[category].notes.push(note);
      return acc;
    }, {} as Record<string, { name: string; count: number; notes: Note[] }>);

    return Object.values(subjects);
  };

  const subjects = getSubjects();

  const getCategoryNotes = (category: string) => {
    return notes.filter((note) => note.category === category);
  };

  const addNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    const note: Note = {
      id: Date.now().toString(),
      title: newNote.title,
      content: newNote.content,
      source: "manual",
      category: newNote.category,
      createdAt: new Date().toISOString(),
      tags: newNote.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag),
    };

    setNotes((prev) => [note, ...prev]);

    // Save to localStorage
    NotesStorage.add({
      title: note.title,
      content: note.content,
      source: note.source,
      category: note.category,
      tags: note.tags,
    });

    setNewNote({ title: "", content: "", category: "General", tags: "" });
    setIsCreating(false);
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    NotesStorage.remove(id);
    if (selectedNote && selectedNote.id === id) {
      setCurrentView("category");
      setSelectedNote(null);
    }
  };

  // ========== ADVANCED AUDIO FEATURES ==========

  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/#{1,6}\s/g, "") // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold formatting
      .replace(/\*(.*?)\*/g, "$1") // Remove italic formatting
      .replace(/`(.*?)`/g, "$1") // Remove code formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove markdown links
      .replace(/^\s*[-*+]\s+/gm, "") // Remove bullet points
      .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered lists
      .replace(/\n{2,}/g, ". ") // Replace multiple line breaks with periods
      .replace(/\n/g, ". ") // Replace single line breaks with periods
      .trim();
  };

  const playNote = (note: Note) => {
    console.log('playNote called for:', note.title);
    console.log('Note content preview:', note.content?.substring(0, 100) + '...');
    console.log('Note content length:', note.content?.length || 0);
    
    if (!speechSynthesisRef.current || !audioEnabled || !audioSupported) {
      console.warn('Speech synthesis not available');
      alert('Audio is not available. Please ensure your browser supports speech synthesis and try refreshing the page.');
      return;
    }

    if (!audioPermissionGranted) {
      console.log('Audio permission not granted yet, requesting user interaction...');
      alert('Click anywhere on the page first to enable audio, then try again.');
      return;
    }

    try {
      // Set state immediately when clicked
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentAudioNote(note.id);
      console.log('Audio state set - playing:', note.id);

      // Stop any current speech
      speechSynthesisRef.current.cancel();

      const textToSpeak = cleanTextForSpeech(`${note.title}. ${note.content}`);
      
      if (!textToSpeak || textToSpeak.trim().length === 0) {
        console.warn('No text to speak');
        // Reset state if no text
        setIsPlaying(false);
        setCurrentAudioNote(null);
        return;
      }

      console.log('Creating utterance with text length:', textToSpeak.length);
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Configure speech settings
      utterance.rate = Math.max(0.1, Math.min(2, audioSpeed));
      utterance.pitch = 1;
      utterance.volume = 1;

      // Set voice if available
      const voices = speechSynthesisRef.current.getVoices();
      console.log('Available voices:', voices.length);
      
      if (voices.length > 0) {
        if (audioVoice) {
          const selectedVoice = voices.find((voice) => voice.name === audioVoice);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log('Using selected voice:', selectedVoice.name);
          }
        }
        
        // Fallback to first English voice or first available voice
        if (!utterance.voice) {
          const fallbackVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
          if (fallbackVoice) {
            utterance.voice = fallbackVoice;
            console.log('Using fallback voice:', fallbackVoice.name);
          }
        }
      }

      utterance.onstart = () => {
        console.log('Speech actually started for note:', note.title);
        // State already set above, just log
      };

      utterance.onend = () => {
        console.log('Speech ended for note:', note.title);
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentAudioNote(null);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentAudioNote(null);
      };

      utterance.onpause = () => {
        console.log('Speech paused');
        setIsPaused(true);
      };

      utterance.onresume = () => {
        console.log('Speech resumed');
        setIsPaused(false);
      };

      currentUtteranceRef.current = utterance;
      
      // Try speaking immediately and with fallback
      console.log('Attempting to speak...');
      
      const attemptSpeak = () => {
        if (speechSynthesisRef.current && utterance) {
          speechSynthesisRef.current.speak(utterance);
          console.log('Speech synthesis speak() called');
        }
      };

      // Try immediately
      attemptSpeak();
      
      // Fallback: try again after a short delay
      setTimeout(() => {
        if (speechSynthesisRef.current && currentUtteranceRef.current === utterance) {
          console.log('Fallback speak attempt...');
          attemptSpeak();
        }
      }, 300);
      
    } catch (error) {
      console.error('Error in playNote:', error);
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentAudioNote(null);
    }
  };

  const pauseAudio = () => {
    try {
      if (speechSynthesisRef.current && isPlaying && !isPaused) {
        speechSynthesisRef.current.pause();
        setIsPaused(true);
        console.log('Audio paused');
      }
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  const resumeAudio = () => {
    try {
      if (speechSynthesisRef.current && isPaused) {
        speechSynthesisRef.current.resume();
        setIsPaused(false);
        console.log('Audio resumed');
      }
    } catch (error) {
      console.error('Error resuming audio:', error);
    }
  };

  const stopAudio = () => {
    try {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentAudioNote(null);
        console.log('Audio stopped');
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const changeAudioSpeed = (speed: number) => {
    const clampedSpeed = Math.max(0.25, Math.min(2, speed)); // Clamp between 0.25x and 2x
    setAudioSpeed(clampedSpeed);
    
    if (isPlaying && currentUtteranceRef.current) {
      // Restart with new speed
      const currentNote = notes.find((note) => note.id === currentAudioNote);
      if (currentNote) {
        console.log(`Changing speed to ${clampedSpeed}x`);
        stopAudio();
        setTimeout(() => playNote(currentNote), 200);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log("Audio recorded:", audioUrl);
        // Here you could add the audio to the note or process it further
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const generateAudioSummary = (note: Note): string => {
    const lines = note.content.split("\n").filter((line) => line.trim());
    const keyLines = lines
      .filter(
        (line) =>
          line.includes("**") ||
          line.includes("##") ||
          line.includes("Important") ||
          line.includes("Key") ||
          line.includes("Summary")
      )
      .slice(0, 5);

    return keyLines.length > 0
      ? `Key points from ${note.title}: ${keyLines.join(". ")}`
      : `Summary of ${note.title}: ${lines.slice(0, 3).join(". ")}`;
  };

  const playQuickSummary = (note: Note) => {
    if (!speechSynthesisRef.current || !audioEnabled || !audioSupported) {
      console.warn('Speech synthesis not available for summary');
      return;
    }

    try {
      // Stop any current speech
      speechSynthesisRef.current.cancel();
      
      const summary = generateAudioSummary(note);
      
      if (!summary || summary.trim().length === 0) {
        console.warn('No summary to speak');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(summary);
      utterance.rate = Math.min(2, audioSpeed * 1.2); // Slightly faster for summaries
      utterance.pitch = 1;
      utterance.volume = 1;

      // Set voice if available
      const voices = speechSynthesisRef.current.getVoices();
      if (audioVoice && voices.length > 0) {
        const selectedVoice = voices.find((voice) => voice.name === audioVoice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onstart = () => {
        console.log('Summary playback started');
      };

      utterance.onend = () => {
        console.log('Summary playback ended');
      };

      utterance.onerror = (event) => {
        console.error('Summary playback error:', event);
      };

      setTimeout(() => {
        if (speechSynthesisRef.current) {
          speechSynthesisRef.current.speak(utterance);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error in playQuickSummary:', error);
    }
  };

  // ========== ENHANCED NOTES ANALYSIS ==========

  const analyzeNote = (note: Note) => {
    const wordCount = note.content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    // Determine difficulty based on content complexity
    const complexTerms = (
      note.content.match(/\b[A-Z][a-z]*[A-Z][a-z]*\b/g) || []
    ).length;
    const technicalTerms = (
      note.content.match(
        /\b(algorithm|protocol|method|system|implementation|architecture)\b/gi
      ) || []
    ).length;

    let difficulty: "beginner" | "intermediate" | "advanced" = "beginner";
    if (complexTerms > 10 || technicalTerms > 5) difficulty = "advanced";
    else if (complexTerms > 5 || technicalTerms > 2)
      difficulty = "intermediate";

    // Extract key points
    const keyPoints = note.content
      .split("\n")
      .filter(
        (line) =>
          line.includes("**") || line.includes("##") || line.includes("•")
      )
      .slice(0, 5)
      .map((line) => line.replace(/[#*]/g, "").trim());

    return {
      readingTime,
      difficulty,
      keyPoints,
      wordCount,
      complexTerms,
      technicalTerms,
    };
  };

  const renameCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;

    const updatedNotes = notes.map((note) =>
      note.category === oldName ? { ...note, category: newName } : note
    );

    setNotes(updatedNotes);

    // Update localStorage
    const storageNotes = NotesStorage.load();
    const updatedStorageNotes = storageNotes.map((note) =>
      note.category === oldName ? { ...note, category: newName } : note
    );
    NotesStorage.save(updatedStorageNotes);

    if (selectedCategory === oldName) {
      setSelectedCategory(newName);
    }

    setIsEditingCategory("");
    setNewCategoryName("");
  };

  const getCategoryColor = (category: string) => {
    const categoryLower = category.toLowerCase();
    const colors: Record<string, string> = {
      devops: "from-blue-500 to-blue-600",
      programming: "from-green-500 to-green-600",
      "web development": "from-cyan-500 to-cyan-600",
      "data science": "from-purple-500 to-purple-600",
      database: "from-indigo-500 to-indigo-600",
      "cloud computing": "from-sky-500 to-sky-600",
      cybersecurity: "from-red-500 to-red-600",
      mathematics: "from-orange-500 to-orange-600",
      physics: "from-violet-500 to-violet-600",
      chemistry: "from-pink-500 to-pink-600",
      biology: "from-emerald-500 to-emerald-600",
      business: "from-amber-500 to-amber-600",
      history: "from-yellow-500 to-yellow-600",
      literature: "from-rose-500 to-rose-600",
      language: "from-teal-500 to-teal-600",
      "block chain": "from-purple-600 to-purple-700",
      blockchain: "from-purple-600 to-purple-700",
      general: "from-gray-500 to-gray-600",
    };

    return colors[categoryLower] || "from-slate-500 to-slate-600";
  };

  const formatNoteContent = (content: string) => {
    // Split content into structured points
    const lines = content.split("\n").filter((line) => line.trim());
    const structuredContent = [];
    let currentSection = "";
    let currentPoints = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if it's a heading
      if (
        trimmedLine.startsWith("#") ||
        (trimmedLine.includes(":") && trimmedLine.length < 100)
      ) {
        if (currentSection && currentPoints.length > 0) {
          structuredContent.push({
            section: currentSection,
            points: currentPoints,
          });
        }
        currentSection = trimmedLine.replace(/^#+\s*/, "").replace(":", "");
        currentPoints = [];
      } else if (
        trimmedLine.startsWith("•") ||
        trimmedLine.startsWith("-") ||
        trimmedLine.startsWith("*")
      ) {
        currentPoints.push(trimmedLine.replace(/^[•\-\*]\s*/, ""));
      } else if (trimmedLine.length > 10) {
        // Split long paragraphs into key points
        const sentences = trimmedLine
          .split(/[.!?]/)
          .filter((s) => s.trim().length > 10);
        currentPoints.push(...sentences.map((s) => s.trim()));
      }
    }

    if (currentSection && currentPoints.length > 0) {
      structuredContent.push({
        section: currentSection,
        points: currentPoints,
      });
    }

    // If no structured content found, create a general section
    if (structuredContent.length === 0) {
      const sentences = content
        .split(/[.!?]/)
        .filter((s) => s.trim().length > 10);
      structuredContent.push({
        section: "Key Points",
        points: sentences.map((s) => s.trim()),
      });
    }

    return structuredContent;
  };

  // Render different views
  const renderSubjectsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Study Subjects</h2>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Note title..."
                value={newNote.title}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <Input
                placeholder="Subject/Category..."
                value={newNote.category}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, category: e.target.value }))
                }
              />
              <Textarea
                placeholder="Write your notes here..."
                value={newNote.content}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={8}
              />
              <Input
                placeholder="Tags (comma separated)..."
                value={newNote.tags}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, tags: e.target.value }))
                }
              />
              <div className="flex gap-2">
                <Button onClick={addNote} className="flex-1">
                  Create Note
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search subjects or notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects
          .filter(
            (subject) =>
              searchTerm === "" ||
              subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              subject.notes.some(
                (note) =>
                  note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  note.content.toLowerCase().includes(searchTerm.toLowerCase())
              )
          )
          .map((subject) => (
            <Card
              key={subject.name}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/30 hover:border-l-primary"
              onClick={() => {
                setSelectedCategory(subject.name);
                setCurrentView("category");
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-r ${getCategoryColor(
                      subject.name
                    )} flex items-center justify-center`}
                  >
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary"
                    >
                      {subject.count} notes
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingCategory(subject.name);
                        setNewCategoryName(subject.name);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {isEditingCategory === subject.name ? (
                  <div
                    className="space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() =>
                          renameCategory(subject.name, newCategoryName)
                        }
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingCategory("")}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <CardTitle className="text-lg">{subject.name}</CardTitle>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subject.notes.slice(0, 3).map((note) => (
                    <div
                      key={note.id}
                      className="text-sm text-muted-foreground truncate"
                    >
                      • {note.title}
                    </div>
                  ))}
                  {subject.count > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{subject.count - 3} more notes...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {subjects.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            No notes yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Upload files or create notes to get started!
          </p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Note
          </Button>
        </div>
      )}
    </div>
  );

  const renderCategoryView = () => {
    const categoryNotes = getCategoryNotes(selectedCategory);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentView("subjects")}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div
            className={`w-12 h-12 rounded-lg bg-gradient-to-r ${getCategoryColor(
              selectedCategory
            )} flex items-center justify-center`}
          >
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{selectedCategory}</h2>
            <p className="text-muted-foreground">
              {categoryNotes.length} notes
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes in this subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid gap-4">
          {categoryNotes
            .filter(
              (note) =>
                searchTerm === "" ||
                note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.content.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((note) => (
              <Card
                key={note.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => {
                  setSelectedNote(note);
                  setCurrentView("note");
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">
                        {note.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {new Date(note.createdAt).toLocaleDateString()}
                        <span className="mx-2">•</span>
                        <FileText className="w-3 h-3" />
                        {note.source}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {note.content.substring(0, 150)}...
                  </p>

                  {/* Enhanced Note Analysis */}
                  {(() => {
                    const analysis = analyzeNote(note);
                    return (
                      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {analysis.readingTime} min read
                        </Badge>
                        <Badge
                          variant={
                            analysis.difficulty === "advanced"
                              ? "destructive"
                              : analysis.difficulty === "intermediate"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {analysis.difficulty}
                        </Badge>
                        <span>{analysis.wordCount} words</span>
                      </div>
                    );
                  })()}

                  {/* Enhanced Audio Controls */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      {/* Always show play button, but change behavior based on state */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Listen button clicked for note:', note.title, 'note.id:', note.id);
                          console.log('Current audio state - currentAudioNote:', currentAudioNote, 'isPlaying:', isPlaying, 'isPaused:', isPaused);
                          
                          if (currentAudioNote === note.id && isPlaying) {
                            // If this note is playing, pause/resume
                            console.log('Note is currently playing, toggling pause/resume');
                            isPaused ? resumeAudio() : pauseAudio();
                          } else {
                            // Start playing this note
                            console.log('Starting to play note:', note.title);
                            playNote(note);
                          }
                        }}
                        className="h-8 w-8 p-0"
                        disabled={!audioEnabled || !audioSupported || !voicesLoaded}
                        title={
                          currentAudioNote === note.id && isPlaying
                            ? (isPaused ? "Resume Audio" : "Pause Audio")
                            : "Play Note Audio"
                        }
                      >
                        {currentAudioNote === note.id && isPlaying ? (
                          isPaused ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Pause className="w-4 h-4" />
                          )
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Stop button - only show when this note is playing */}
                      {currentAudioNote === note.id && (isPlaying || isPaused) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            stopAudio();
                          }}
                          className="h-8 w-8 p-0"
                          title="Stop Audio"
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          playQuickSummary(note);
                        }}
                        className="h-8 w-8 p-0"
                        disabled={!audioEnabled || !audioSupported || !voicesLoaded}
                        title="Play Quick Summary"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>

                      {currentAudioNote === note.id && isPlaying && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            stopAudio();
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Study Mode Indicator */}
                    {studyMode !== "normal" && (
                      <Badge variant="outline" className="text-xs">
                        <Brain className="w-3 h-3 mr-1" />
                        {studyMode}
                      </Badge>
                    )}

                    {/* Audio Status */}
                    {currentAudioNote === note.id && isPlaying && (
                      <Badge
                        variant="default"
                        className="text-xs animate-pulse"
                      >
                        <Headphones className="w-3 h-3 mr-1" />
                        Playing {audioSpeed}x
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {note.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {note.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{note.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {categoryNotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No notes in {selectedCategory}
            </h3>
            <p className="text-muted-foreground">
              Upload files related to {selectedCategory} to create notes
              automatically!
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderNoteView = () => {
    if (!selectedNote) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentView("category")}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div
            className={`w-10 h-10 rounded-lg bg-gradient-to-r ${getCategoryColor(
              selectedNote.category
            )} flex items-center justify-center`}
          >
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{selectedNote.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(selectedNote.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {selectedNote.category}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {selectedNote.source}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteNote(selectedNote.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Enhanced Study Notes
              </div>
              
              {/* Listen button for the currently opened note */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('Listen button clicked in detailed view for selectedNote:', selectedNote?.title);
                    console.log('Selected note content preview:', selectedNote?.content?.substring(0, 100));
                    if (selectedNote) {
                      if (currentAudioNote === selectedNote.id && isPlaying) {
                        // If this note is playing, pause/resume
                        console.log('Note is currently playing in detailed view, toggling pause/resume');
                        isPaused ? resumeAudio() : pauseAudio();
                      } else {
                        console.log('Starting to play selectedNote from detailed view:', selectedNote.title);
                        playNote(selectedNote);
                      }
                    } else {
                      console.warn('No selectedNote available to play');
                    }
                  }}
                  className="h-8 w-8 p-0"
                  disabled={!audioEnabled || !audioSupported || !voicesLoaded || !selectedNote}
                  title="Listen to this note"
                >
                  {currentAudioNote === selectedNote?.id && isPlaying ? (
                    isPaused ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                
                {/* Stop button */}
                {currentAudioNote === selectedNote?.id && isPlaying && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      console.log('Stop button clicked in detailed view');
                      stopAudio();
                    }}
                    className="h-8 w-8 p-0"
                    title="Stop Audio"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none bg-card rounded-lg">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1
                    className="text-2xl font-bold text-primary mt-6 mb-4 pb-2 border-b border-primary/20"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className="text-xl font-bold text-primary/90 mt-5 mb-3 pb-1 border-b border-primary/10"
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    className="text-lg font-semibold text-primary/80 mt-4 mb-2"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc ml-6 my-3 space-y-1" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal ml-6 my-3 space-y-1" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li
                    className="my-1 text-foreground leading-relaxed"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p
                    className="my-3 text-foreground leading-relaxed"
                    {...props}
                  />
                ),
                code: ({ node, ...props }: any) =>
                  props.inline ? (
                    <code
                      className="px-2 py-1 bg-muted rounded text-sm font-mono text-primary"
                      {...props}
                    />
                  ) : (
                    <code className="block" {...props} />
                  ),
                pre: ({ node, ...props }) => (
                  <pre
                    className="p-4 bg-muted rounded-lg overflow-auto my-4 text-sm font-mono border border-border"
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-primary" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-primary/30 pl-4 italic my-4 text-muted-foreground bg-muted/20 py-2 rounded-r"
                    {...props}
                  />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table
                      className="min-w-full border-collapse border border-border"
                      {...props}
                    />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th
                    className="border border-border px-3 py-2 bg-muted font-semibold text-left"
                    {...props}
                  />
                ),
                td: ({ node, ...props }) => (
                  <td className="border border-border px-3 py-2" {...props} />
                ),
                hr: ({ node, ...props }) => (
                  <hr className="my-6 border-border" {...props} />
                ),
              }}
            >
              {selectedNote.content}
            </ReactMarkdown>
          </CardContent>
        </Card>

        {selectedNote.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedNote.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Main render
  return (
    <div className="cyber-glow animate-scale-in p-6">
      {/* Advanced Audio Control Panel */}
      {audioEnabled && (
        <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Headphones className="w-5 h-5 text-primary" />
                Advanced Audio Study Assistant
              </CardTitle>
              <div className="flex items-center gap-2">
                {!audioSupported && (
                  <Badge variant="destructive" className="text-xs">
                    Audio Not Supported
                  </Badge>
                )}
                {audioSupported && !voicesLoaded && (
                  <Badge variant="secondary" className="text-xs">
                    Loading Voices...
                  </Badge>
                )}
                {audioSupported && voicesLoaded && (
                  <Badge variant="secondary" className="text-xs">
                    Audio Ready
                  </Badge>
                )}
                {audioSupported && voicesLoaded && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('Test audio button clicked');
                      if (speechSynthesisRef.current) {
                        // Clear any existing speech
                        speechSynthesisRef.current.cancel();
                        
                        const testUtterance = new SpeechSynthesisUtterance("Audio test successful. Your text-to-speech is working properly.");
                        testUtterance.rate = audioSpeed;
                        testUtterance.volume = 1;
                        testUtterance.pitch = 1;
                        
                        // Use default voice
                        const voices = speechSynthesisRef.current.getVoices();
                        if (voices.length > 0) {
                          const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
                          testUtterance.voice = englishVoice;
                          console.log('Test using voice:', englishVoice.name);
                        }
                        
                        testUtterance.onstart = () => console.log('Test audio started');
                        testUtterance.onend = () => console.log('Test audio ended');
                        testUtterance.onerror = (e) => console.error('Test audio error:', e);
                        
                        console.log('Speaking test audio...');
                        speechSynthesisRef.current.speak(testUtterance);
                      } else {
                        console.error('speechSynthesisRef.current is null');
                      }
                    }}
                    className="text-xs px-2 h-6"
                  >
                    Test Audio
                  </Button>
                )}
                
                {/* Debug Info */}
                {audioSupported && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('=== AUDIO DEBUG INFO ===');
                      console.log('audioSupported:', audioSupported);
                      console.log('voicesLoaded:', voicesLoaded);
                      console.log('audioEnabled:', audioEnabled);
                      console.log('speechSynthesisRef.current:', !!speechSynthesisRef.current);
                      if (speechSynthesisRef.current) {
                        const voices = speechSynthesisRef.current.getVoices();
                        console.log('Available voices:', voices.length);
                        console.log('Voices:', voices.map(v => v.name));
                        console.log('Speaking:', speechSynthesisRef.current.speaking);
                        console.log('Pending:', speechSynthesisRef.current.pending);
                        console.log('Paused:', speechSynthesisRef.current.paused);
                      }
                      console.log('isPlaying:', isPlaying);
                      console.log('isPaused:', isPaused);
                      console.log('currentAudioNote:', currentAudioNote);
                      console.log('========================');
                    }}
                    className="text-xs px-2 h-6"
                  >
                    Debug
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className="h-8 w-8 p-0"
                  disabled={!audioSupported}
                  title={audioSupported ? (audioEnabled ? "Disable Audio" : "Enable Audio") : "Audio not supported in this browser"}
                >
                  {audioEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </Button>
                {isRecording ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopRecording}
                    className="h-8 w-8 p-0"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startRecording}
                    className="h-8 w-8 p-0"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Audio Speed Control */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Playback Speed</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeAudioSpeed(0.5)}
                    disabled={!isPlaying}
                    className={
                      audioSpeed === 0.5
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    0.5x
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeAudioSpeed(1)}
                    disabled={!isPlaying}
                    className={
                      audioSpeed === 1
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    1x
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeAudioSpeed(1.5)}
                    disabled={!isPlaying}
                    className={
                      audioSpeed === 1.5
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    1.5x
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeAudioSpeed(2)}
                    disabled={!isPlaying}
                    className={
                      audioSpeed === 2
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    2x
                  </Button>
                </div>
              </div>

              {/* Study Mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Study Mode</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStudyMode("normal")}
                    className={
                      studyMode === "normal"
                        ? "bg-secondary text-secondary-foreground"
                        : ""
                    }
                  >
                    Normal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStudyMode("focus")}
                    className={
                      studyMode === "focus"
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    <Brain className="w-3 h-3 mr-1" />
                    Focus
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStudyMode("review")}
                    className={
                      studyMode === "review"
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }
                  >
                    Review
                  </Button>
                </div>
              </div>

              {/* Notes Difficulty Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty Level</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotesDifficulty("all")}
                    className={
                      notesDifficulty === "all"
                        ? "bg-muted text-muted-foreground"
                        : ""
                    }
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotesDifficulty("beginner")}
                    className={
                      notesDifficulty === "beginner"
                        ? "bg-green-500 text-white"
                        : ""
                    }
                  >
                    Beginner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotesDifficulty("intermediate")}
                    className={
                      notesDifficulty === "intermediate"
                        ? "bg-yellow-500 text-white"
                        : ""
                    }
                  >
                    Intermediate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotesDifficulty("advanced")}
                    className={
                      notesDifficulty === "advanced"
                        ? "bg-red-500 text-white"
                        : ""
                    }
                  >
                    Advanced
                  </Button>
                </div>
              </div>
            </div>

            {/* Audio Status Display */}
            {isPlaying && currentAudioNote && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">
                      Now Playing:{" "}
                      {notes.find((n) => n.id === currentAudioNote)?.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs">
                      {audioSpeed}x speed
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={stopAudio}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentView === "subjects" && renderSubjectsView()}
      {currentView === "category" && renderCategoryView()}
      {currentView === "note" && renderNoteView()}
    </div>
  );
};

export default NotesManager;

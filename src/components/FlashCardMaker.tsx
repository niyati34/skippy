import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Brain,
  Plus,
  RotateCcw,
  Shuffle,
  Check,
  X,
  Trash2,
  FileText,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initSrs, isDue, review, SrsState } from "@/lib/srs";
import {
  FlashcardStorage,
  StoredFlashcard,
  NotesStorage,
  StoredNote,
} from "@/lib/storage";
import { generateFlashcardsFromContent } from "@/services/fileProcessor";

interface FlashCard {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FlashCardMakerProps {
  flashcards?: any[];
}

const FlashCardMaker = ({
  flashcards: externalCards = [],
}: FlashCardMakerProps) => {
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
  const [newCard, setNewCard] = useState({
    question: "",
    answer: "",
    category: "",
  });
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [dueOnly, setDueOnly] = useState(true);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [availableNotes, setAvailableNotes] = useState<StoredNote[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [isGeneratingFromNotes, setIsGeneratingFromNotes] = useState(false);
  const { toast } = useToast();

  // Load flashcards from localStorage on component mount
  useEffect(() => {
    const loadedFlashcards = FlashcardStorage.load();
    const formattedCards = loadedFlashcards.map((card) => ({
      id: card.id,
      question: card.question,
      answer: card.answer,
      category: card.category,
      // keep SRS in memory via side-map if needed later
    }));
    setFlashCards(formattedCards);
  }, []);

  // Load available notes for flashcard generation
  useEffect(() => {
    const loadedNotes = NotesStorage.load();
    setAvailableNotes(loadedNotes);
  }, []);

  useEffect(() => {
    if (externalCards.length > 0) {
      const newCards = externalCards.map((card, index) => ({
        id: (Date.now() + index).toString(),
        question: card.question || card.front || "Question",
        answer: card.answer || card.back || "Answer",
        category: card.category || "General",
      }));
      setFlashCards((prev) => [...prev, ...newCards]);

      // Save new cards to localStorage
      const flashcardsToSave = newCards.map((card) => ({
        question: card.question,
        answer: card.answer,
        category: card.category,
        source: "uploaded_file",
      }));
      FlashcardStorage.addBatch(flashcardsToSave);

      toast({
        title: "New flashcards added! 🎯",
        description: `Added ${newCards.length} flashcards from your content.`,
      });
    }
  }, [externalCards, toast]);

  const addFlashCard = () => {
    if (newCard.question && newCard.answer && newCard.category) {
      const card: FlashCard = {
        id: Date.now().toString(),
        ...newCard,
      };
      setFlashCards([...flashCards, card]);

      // Save to localStorage
      FlashcardStorage.add({
        question: newCard.question,
        answer: newCard.answer,
        category: newCard.category,
        source: "manual_entry",
      });

      setNewCard({ question: "", answer: "", category: "" });
      toast({
        title: "Flash card created! 🎯",
        description: `Added "${newCard.question}" to ${newCard.category}`,
      });
    }
  };

  const shuffleCards = () => {
    const shuffled = [...flashCards].sort(() => Math.random() - 0.5);
    setFlashCards(shuffled);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    toast({
      title: "Cards shuffled! 🔀",
      description: "Ready for a new challenge!",
    });
  };

  const nextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % flashCards.length);
    setShowAnswer(false);
  };

  const markAnswer = (quality: 0 | 2 | 3 | 4) => {
    const current = FlashcardStorage.load().find(
      (c) => c.id === currentCard.id
    );
    const now = new Date();
    const prevSrs: SrsState = current?.srs || initSrs(now);
    const updated = review(prevSrs, quality, now);
    FlashcardStorage.upsertSrs(currentCard.id, updated);

    setScore((prev) => ({
      correct: prev.correct + (quality >= 3 ? 1 : 0),
      total: prev.total + 1,
    }));
    setTimeout(nextCard, 400);
  };

  const resetStudy = () => {
    setScore({ correct: 0, total: 0 });
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  // Delete individual flashcard
  const deleteFlashCard = (cardId: string) => {
    setFlashCards((prev) => prev.filter((card) => card.id !== cardId));
    FlashcardStorage.remove(cardId);

    // Adjust current card index if needed
    if (currentCardIndex >= flashCards.length - 1) {
      setCurrentCardIndex(Math.max(0, flashCards.length - 2));
    }

    toast({
      title: "Card deleted! 🗑️",
      description: "Flashcard removed successfully.",
    });
  };

  // Delete all flashcards
  const deleteAllFlashCards = () => {
    setFlashCards([]);
    FlashcardStorage.save([]);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setScore({ correct: 0, total: 0 });

    toast({
      title: "All cards deleted! 🗑️",
      description: "All flashcards have been removed.",
    });
  };

  // Generate flashcards from selected notes
  const generateFromSelectedNotes = async () => {
    if (selectedNotes.length === 0) {
      toast({
        title: "No notes selected",
        description: "Please select at least one note to generate flashcards.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingFromNotes(true);

    try {
      const selectedNoteData = availableNotes.filter((note) =>
        selectedNotes.includes(note.id)
      );

      let totalNewCards = 0;

      for (const note of selectedNoteData) {
        const content = `${note.title}\n\n${note.content}`;
        const newCards = await generateFlashcardsFromContent(
          content,
          `note-${note.title}`
        );

        if (newCards.length > 0) {
          const formattedCards = newCards.map((card, index) => ({
            id: (Date.now() + Math.random()).toString(),
            question: card.question,
            answer: card.answer,
            category: note.category || "Generated from Notes",
          }));

          setFlashCards((prev) => [...prev, ...formattedCards]);

          // Save to storage
          const flashcardsToSave = newCards.map((card) => ({
            question: card.question,
            answer: card.answer,
            category: note.category || "Generated from Notes",
            source: `note-${note.title}`,
          }));
          FlashcardStorage.addBatch(flashcardsToSave);

          totalNewCards += newCards.length;
        }
      }

      setShowNotesDialog(false);
      setSelectedNotes([]);

      toast({
        title: "Flashcards generated! 🎯",
        description: `Created ${totalNewCards} flashcards from ${selectedNoteData.length} notes.`,
      });
    } catch (error) {
      console.error("Error generating flashcards from notes:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate flashcards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFromNotes(false);
    }
  };

  // Toggle note selection
  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes((prev) =>
      prev.includes(noteId)
        ? prev.filter((id) => id !== noteId)
        : [...prev, noteId]
    );
  };

  const currentCard = flashCards[currentCardIndex];
  const all = FlashcardStorage.load();
  const visibleIndices = flashCards
    .map((c, idx) => ({ c, idx }))
    .filter(({ c }) => {
      if (!dueOnly) return true;
      const found = all.find((f) => f.id === c.id);
      return !found?.srs || isDue(found.srs);
    })
    .map(({ idx }) => idx);
  const isDeckEmpty = visibleIndices.length === 0;
  const effectiveIndex = visibleIndices.includes(currentCardIndex)
    ? currentCardIndex
    : visibleIndices[0] ?? 0;
  const effectiveCard = flashCards[effectiveIndex];

  return (
    <div className="space-y-6">
      {/* Create Flash Cards */}
      <Card className="cyber-glow animate-scale-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Flash Card Maker
              <Badge
                variant="outline"
                className="ml-2 bg-primary/20 text-primary border-primary/50"
              >
                {flashCards.length} cards
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={dueOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setDueOnly((v) => !v)}
              >
                {dueOnly ? "Due Only" : "All Cards"}
              </Button>
              {/* Generate from Notes Dialog */}
              <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    From Notes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Generate Flashcards from Notes
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {availableNotes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>
                          No notes available. Upload some files first to create
                          notes!
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">
                            Select notes to generate flashcards from:
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedNotes(
                                selectedNotes.length === availableNotes.length
                                  ? []
                                  : availableNotes.map((n) => n.id)
                              )
                            }
                          >
                            {selectedNotes.length === availableNotes.length
                              ? "Deselect All"
                              : "Select All"}
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {availableNotes.map((note) => (
                            <div
                              key={note.id}
                              className="flex items-start gap-3 p-3 border border-primary/20 rounded-lg hover:bg-primary/5"
                            >
                              <Checkbox
                                checked={selectedNotes.includes(note.id)}
                                onCheckedChange={() =>
                                  toggleNoteSelection(note.id)
                                }
                              />
                              <div className="flex-1">
                                <h4 className="font-medium">{note.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {note.category} •{" "}
                                  {note.content.substring(0, 100)}...
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setShowNotesDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={generateFromSelectedNotes}
                            disabled={
                              selectedNotes.length === 0 ||
                              isGeneratingFromNotes
                            }
                            className="flex items-center gap-2"
                          >
                            {isGeneratingFromNotes ? (
                              <>Generating...</>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate {selectedNotes.length} Notes
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Delete All Cards */}
              {flashCards.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete All Flashcards?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete all {flashCards.length} flashcards.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteAllFlashCards}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Category (e.g., Math, Science)"
              value={newCard.category}
              onChange={(e) =>
                setNewCard({ ...newCard, category: e.target.value })
              }
            />
            <div className="md:col-span-2">
              <Input
                placeholder="Question..."
                value={newCard.question}
                onChange={(e) =>
                  setNewCard({ ...newCard, question: e.target.value })
                }
              />
            </div>
          </div>
          <Textarea
            placeholder="Answer..."
            value={newCard.answer}
            onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
            rows={3}
          />
          <Button onClick={addFlashCard} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create Flash Card
          </Button>
        </CardContent>
      </Card>

      {/* Study Mode */}
      {flashCards.length > 0 && (
        <Card className="cyber-glow animate-scale-in">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-primary" />
                Study Mode
                <Badge variant="outline" className="ml-2">
                  {currentCardIndex + 1} / {flashCards.length}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={() => setStudyMode(!studyMode)}>
                  {studyMode ? "Exit Study" : "Start Study"}
                </Button>
                <Button variant="outline" onClick={shuffleCards}>
                  Shuffle
                </Button>
                <Button variant="outline" onClick={resetStudy}>
                  Reset
                </Button>
                <Badge variant="outline">
                  Score: {score.correct}/{score.total}
                </Badge>
                <Badge variant="secondary">
                  {dueOnly ? "Showing due" : "Showing all"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {studyMode ? (
              <>
                {isDeckEmpty ? (
                  <div className="p-6 text-center text-muted-foreground border rounded-lg">
                    No due cards. Great job! Switch to "All Cards" to keep
                    practicing.
                  </div>
                ) : (
                  <>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        Question
                      </div>
                      <div className="text-lg font-medium">
                        {effectiveCard.question}
                      </div>
                    </div>
                    {showAnswer && (
                      <div className="p-4 border rounded-lg bg-muted/40">
                        <div className="text-sm text-muted-foreground">
                          Answer
                        </div>
                        <div className="text-lg">{effectiveCard.answer}</div>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => setShowAnswer(true)}
                      >
                        Show Answer
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => markAnswer(0)}
                      >
                        Again
                      </Button>
                      <Button variant="secondary" onClick={() => markAnswer(2)}>
                        Hard
                      </Button>
                      <Button variant="secondary" onClick={() => markAnswer(3)}>
                        Good
                      </Button>
                      <Button onClick={() => markAnswer(4)}>Easy</Button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-muted-foreground">
                Start study mode to practice your cards.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Cards Overview */}
      {flashCards.length > 0 && (
        <Card className="cyber-glow animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              All Flashcards
              <Badge variant="outline" className="ml-2">
                {flashCards.length} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {flashCards.map((card, index) => (
                <div
                  key={card.id}
                  className={`p-4 rounded-lg border transition-all hover:shadow-lg ${
                    currentCardIndex === index
                      ? "border-primary bg-primary/5"
                      : "border-primary/20 bg-card/80"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {card.category}
                        </Badge>
                        {currentCardIndex === index && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-primary/20 text-primary"
                          >
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-primary mb-1">
                            Question:
                          </p>
                          <p className="text-sm">{card.question}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-400 mb-1">
                            Answer:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {card.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentCardIndex(index);
                          setShowAnswer(false);
                        }}
                        className="text-primary hover:bg-primary/10"
                      >
                        Study
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete This Card?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "
                              {card.question.substring(0, 50)}..."?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteFlashCard(card.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FlashCardMaker;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Plus,
  RotateCcw,
  Shuffle,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FlashcardStorage, StoredFlashcard } from "@/lib/storage";

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
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const { toast } = useToast();

  // Load flashcards from localStorage on component mount
  useEffect(() => {
    const loadedFlashcards = FlashcardStorage.load();
    const formattedCards = loadedFlashcards.map((card) => ({
      id: card.id,
      question: card.question,
      answer: card.answer,
      category: card.category,
    }));
    setFlashCards(formattedCards);
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

  const markAnswer = (correct: boolean) => {
    setScore((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));
    setTimeout(nextCard, 1000);
  };

  const resetStudy = () => {
    setScore({ correct: 0, total: 0 });
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const currentCard = flashCards[currentCardIndex];

  return (
    <div className="space-y-6">
      {/* Create Flash Cards */}
      <Card className="cyber-glow animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Flash Card Maker
          </CardTitle>
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Study Mode
                <Badge variant="outline">
                  {currentCardIndex + 1} / {flashCards.length}
                </Badge>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={shuffleCards}>
                  <Shuffle className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={resetStudy}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {score.total > 0 && (
              <div className="text-sm text-muted-foreground">
                Score: {score.correct}/{score.total} (
                {Math.round((score.correct / score.total) * 100)}%)
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {currentCard && (
              <>
                <div className="text-center">
                  <Badge variant="secondary" className="mb-4">
                    {currentCard.category}
                  </Badge>
                </div>

                <div className="min-h-32 flex items-center justify-center p-6 rounded-lg bg-secondary/20 border-2 border-dashed">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-4">
                      {showAnswer ? "Answer:" : "Question:"}
                    </h3>
                    <p className="text-xl">
                      {showAnswer ? currentCard.answer : currentCard.question}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  {!showAnswer ? (
                    <Button
                      onClick={() => setShowAnswer(true)}
                      className="flex-1 max-w-48"
                    >
                      Show Answer
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => markAnswer(false)}
                        className="flex-1 max-w-32 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Incorrect
                      </Button>
                      <Button
                        onClick={() => markAnswer(true)}
                        className="flex-1 max-w-32 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Correct
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FlashCardMaker;

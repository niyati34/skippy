import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Sparkles, RefreshCw, Lightbulb, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FunLearningProps {
  content?: string;
}

const FunLearning = ({ content = '' }: FunLearningProps) => {
  const [inputText, setInputText] = useState(content);
  const [funContent, setFunContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (content) {
      setInputText(content);
    }
  }, [content]);

  const learningModes = [
    { 
      id: 'story', 
      title: 'Story Mode', 
      icon: '📖', 
      description: 'Turn content into an exciting story',
      prompt: 'Create an engaging story that teaches this concept:'
    },
    { 
      id: 'game', 
      title: 'Game Mode', 
      icon: '🎮', 
      description: 'Make it a fun game or challenge',
      prompt: 'Turn this into a fun game or interactive challenge:'
    },
    { 
      id: 'analogy', 
      title: 'Analogy Mode', 
      icon: '🔗', 
      description: 'Explain using fun analogies',
      prompt: 'Explain this concept using creative analogies and comparisons:'
    },
    { 
      id: 'mnemonic', 
      title: 'Memory Tricks', 
      icon: '🧠', 
      description: 'Create memory aids and tricks',
      prompt: 'Create memorable mnemonics and memory tricks for:'
    },
    { 
      id: 'quiz', 
      title: 'Interactive Quiz', 
      icon: '❓', 
      description: 'Turn into quiz questions',
      prompt: 'Create engaging quiz questions and answers for:'
    },
    { 
      id: 'comic', 
      title: 'Comic Strip', 
      icon: '💭', 
      description: 'Explain as a comic story',
      prompt: 'Create a comic strip dialogue that explains:'
    }
  ];

  const [selectedMode, setSelectedMode] = useState(learningModes[0]);

  const generateFunContent = () => {
    if (!inputText.trim()) {
      toast({
        title: "Add some content first!",
        description: "Please enter text, notes, or assignment content to make it fun.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const examples = {
        story: `📖 **The Adventure of ${inputText.split(' ')[0]}**

Once upon a time in the magical land of Knowledge, there lived a curious student who discovered that ${inputText.toLowerCase()}. 

This discovery led them on an epic quest where they had to:
• Understand the core concepts by solving riddles
• Apply the knowledge to help magical creatures
• Share their wisdom with fellow adventurers

The student learned that mastering this topic was like unlocking a secret power that would help them in future adventures!

*Moral: Every piece of knowledge is a treasure waiting to be discovered!*`,

        game: `🎮 **Learning Challenge: Master the Concept!**

**LEVEL 1: Understanding** 
- Read through: ${inputText}
- Score points by identifying 3 key concepts
- Bonus: Explain in your own words

**LEVEL 2: Application**
- Create 2 examples using what you learned
- Solve practice problems
- Unlock achievement: "Concept Master"

**LEVEL 3: Teaching**
- Explain it to someone else
- Create a mini-lesson
- Final Boss: Apply to real-world scenario

**Rewards**: Knowledge coins, understanding badges, and the satisfaction of mastery!`,

        analogy: `🔗 **Understanding Through Analogies**

Think of "${inputText}" like:

🏠 **Building a House**: Each concept is like a building block. You need a strong foundation (basic understanding) before adding the walls (details) and roof (applications).

🍰 **Baking a Cake**: Just like following a recipe, learning this requires the right ingredients (facts), proper mixing (understanding), and time in the oven (practice) to get the perfect result.

🌱 **Growing a Plant**: Knowledge grows like a seed - you plant it in your mind, water it with practice, and watch it bloom into understanding!`,

        mnemonic: `🧠 **Memory Magic Tricks**

For remembering "${inputText}":

**Acronym Method**: Create a catchy phrase using first letters
**Rhyme Time**: Make it rhyme for easy recall
**Visual Memory**: Picture it as a funny image in your mind
**Story Chain**: Link concepts in a silly story sequence

**Quick Trick**: Every time you see this topic, imagine a dancing banana explaining it to a group of excited penguins! 🍌🐧

*The sillier the image, the better you'll remember it!*`,

        quiz: `❓ **Interactive Learning Quiz**

**Question 1**: What is the main idea of "${inputText}"?
a) Option A  b) Option B  c) Option C

**Quick Challenge**: Explain this concept in exactly 10 words or less!

**True or False**: This concept applies to real-world situations.

**Creative Question**: If this topic was a superhero, what would its superpower be and why?

**Bonus Round**: Draw a simple diagram or doodle that represents this concept!`,

        comic: `💭 **Comic Strip: "The Learning Adventures"**

**Panel 1**: 
Student: "Ugh, I don't understand ${inputText}!"
Skippy: "Fear not! Let me show you the secret!"

**Panel 2**:
Skippy: "Imagine this concept as a friendly monster that just wants to be understood!"
Student: "A monster? Really?"

**Panel 3**:
*Student visualizes the concept as a cute, helpful creature*
Student: "Oh! Now I see how it works!"

**Panel 4**:
Student: "Thanks Skippy! Learning is actually fun when you make it come alive!"
Skippy: "That's the magic of creative learning! 🌟"`
      };

      setFunContent(examples[selectedMode.id as keyof typeof examples]);
      setLoading(false);
      
      toast({
        title: "Fun learning content created! 🎉",
        description: `Your content has been transformed using ${selectedMode.title}!`
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="cyber-glow animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            Fun Learning Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your assignment, notes, or any text you want to make fun and engaging..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={4}
          />
          
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Choose Learning Style:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {learningModes.map((mode) => (
                <Button
                  key={mode.id}
                  variant={selectedMode.id === mode.id ? "default" : "outline"}
                  onClick={() => setSelectedMode(mode)}
                  className="h-auto p-3 flex flex-col items-center gap-1 text-center"
                >
                  <span className="text-lg">{mode.icon}</span>
                  <span className="text-xs">{mode.title}</span>
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedMode.description}
            </p>
          </div>

          <Button 
            onClick={generateFunContent} 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Creating fun content...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Make It Fun!
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {funContent && (
        <Card className="cyber-glow animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedMode.icon}</span>
              {selectedMode.title} Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {funContent}
              </pre>
            </div>
            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setFunContent(null)}
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigator.clipboard.writeText(funContent)}
                size="sm"
              >
                📋 Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FunLearning;
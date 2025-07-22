import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, Send, Upload, MessageCircle, Image, Calendar, BookOpen, Gamepad2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { callAzureOpenAI, ChatMessage, analyzeFileContent, generateScheduleFromContent, generateFlashcards, generateFunLearning, generateNotesFromContent, extractTextFromImage } from '@/services/azureOpenAI';

interface DashboardAIProps {
  onScheduleUpdate: (items: any[]) => void;
  onFlashcardsUpdate: (cards: any[]) => void;
  onFunLearningUpdate: (content: string, type: string) => void;
  onNotesUpdate: (notes: any[]) => void;
}

const DashboardAI = ({ onScheduleUpdate, onFlashcardsUpdate, onFunLearningUpdate, onNotesUpdate }: DashboardAIProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Skippy, your study assistant! 🐰 I can help you with:\n• Upload files to create schedules\n• Generate flashcards automatically\n• Make learning fun with stories and games\n• Organize your study materials\n\nWhat would you like to do today?"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fileAnalysis, setFileAnalysis] = useState<any>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      handleSubmit(transcript);
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

  const speakMessage = (message: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
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

  const handleSubmit = async (text?: string) => {
    const messageText = text || inputText;
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await callAzureOpenAI([...messages, userMessage]);
      const assistantMessage: ChatMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
      speakMessageWithElevenLabs(response);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processFileContent = async (file: File) => {
    setIsLoading(true);
    
    try {
      let content = '';
      
      // Handle different file types
      if (file.type.startsWith('image/')) {
        content = await extractTextFromImage(file);
        // Add image processing note
        const imageNote: ChatMessage = {
          role: 'assistant',
          content: `📸 Image uploaded: "${file.name}"\n\nI can see this is an image. Please tell me:\n• What type of content is in this image?\n• What would you like me to help you with?\n\nFor example:\n- "This is my class schedule"\n- "These are my study notes"\n- "This is a diagram I need to understand"`
        };
        setMessages(prev => [...prev, imageNote]);
        speakMessageWithElevenLabs("I've received your image! Please tell me what type of content it contains so I can help you better.");
        
        // Always create notes for images
        const imageNotes = await generateNotesFromContent(content, file.name);
        onNotesUpdate(imageNotes);
        
        return;
      } else {
        // Read text content from documents
        content = await file.text();
      }

      // AI Analysis Phase
      const analysis = await analyzeFileContent(content, file.name);
      setFileAnalysis(analysis);

      // Always generate notes first (auto-processed)
      const notes = await generateNotesFromContent(content, file.name);
      onNotesUpdate(notes);

      // Determine processing workflow based on analysis
      if (analysis.hasScheduleData && analysis.scheduleItems > 0) {
        // Schedule-priority workflow
        await handleSchedulePriorityWorkflow(analysis, content, file.name);
      } else if (analysis.hasEducationalContent && analysis.educationalConcepts > 0) {
        // Educational content workflow
        await handleEducationalContentWorkflow(analysis, content, file.name);
      } else {
        // General notes workflow
        await handleGeneralNotesWorkflow(analysis, file.name);
      }

    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Processing Error",
        description: `Failed to process "${file.name}". The file may be corrupted or in an unsupported format.`,
        variant: "destructive"
      });
      
      // Create basic notes even on error
      const errorNotes = [{
        id: Date.now().toString(),
        title: `${file.name} - Processing Failed`,
        content: `File upload attempted but processing failed. Please try re-uploading or contact support if the issue persists.\n\nFile details:\n- Name: ${file.name}\n- Size: ${(file.size / 1024).toFixed(2)} KB\n- Type: ${file.type}`,
        source: 'error',
        category: 'general',
        createdAt: new Date().toISOString(),
        tags: ['error', 'upload-failed']
      }];
      onNotesUpdate(errorNotes);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedulePriorityWorkflow = async (analysis: any, content: string, fileName: string) => {
    // Extract schedule items first
    const scheduleItems = await generateScheduleFromContent(content);
    
    const confirmationMessage: ChatMessage = {
      role: 'assistant',
      content: `📅 **File Analysis Complete!** 📁\n\n**${fileName}** contains:\n📅 **${analysis.scheduleItems} Schedule Items** detected\n🎓 Educational Content: ${analysis.hasEducationalContent ? 'Yes' : 'No'}\n📝 General Notes: ✅ Auto-saved\n\n**Detected Schedule Items:**\n${scheduleItems.slice(0, 3).map((item, i) => `${i + 1}. ${item.title} - ${item.dueDate}${item.dueTime ? ` at ${item.dueTime}` : ''}`).join('\n')}${scheduleItems.length > 3 ? `\n... and ${scheduleItems.length - 3} more` : ''}\n\n**What would you like me to do?**\n✅ Add all items to Schedule Manager\n⚙️ Let me review and select specific items\n❌ Skip schedule creation${analysis.hasEducationalContent ? '\n🎓 Also create flashcards from educational content?' : ''}`
    };
    
    setMessages(prev => [...prev, confirmationMessage]);
    speakMessageWithElevenLabs(`I found ${analysis.scheduleItems} schedule items in your file. Notes have been auto-saved. Would you like me to add these to your calendar?`);
    
    // Store for user confirmation
    setCurrentFile({ name: fileName, scheduleItems, hasEducational: analysis.hasEducationalContent, content } as any);
    setShowConfirmDialog(true);
  };

  const handleEducationalContentWorkflow = async (analysis: any, content: string, fileName: string) => {
    const confirmationMessage: ChatMessage = {
      role: 'assistant',
      content: `🎓 **Educational Content Detected!** 📚\n\n**${fileName}** contains:\n🎓 **${analysis.educationalConcepts} Educational Concepts** found\n📝 General Notes: ✅ Auto-saved\n\n**Key Topics Identified:**\n${analysis.keyTopics.slice(0, 4).map((topic, i) => `• ${topic}`).join('\n')}\n\n**I can create learning materials:**\n📚 **Flashcards** - Generate Q&A cards from key concepts\n🎯 **Fun Learning** - Create interactive learning activities\n📝 **Notes Only** - Already saved as reference notes\n\n**What would you prefer?**`
    };
    
    setMessages(prev => [...prev, confirmationMessage]);
    speakMessageWithElevenLabs(`I detected educational content with ${analysis.educationalConcepts} key concepts. What type of learning materials would you like me to create?`);
    
    setCurrentFile({ name: fileName, content, isEducational: true } as any);
    setShowConfirmDialog(true);
  };

  const handleGeneralNotesWorkflow = async (analysis: any, fileName: string) => {
    const completionMessage: ChatMessage = {
      role: 'assistant',
      content: `📝 **File Processed Successfully!** ✅\n\n**${fileName}** has been analyzed:\n📝 **Notes Created** - Comprehensive notes saved to Notes Manager\n🔍 **Content Type:** ${analysis.contentType}\n📊 **Confidence:** ${Math.round(analysis.confidence * 100)}%\n\n**Summary:** ${analysis.summary}\n\n**What's Next?**\nYour notes are ready for review! You can:\n• View them in the Notes Manager\n• Ask me questions about the content\n• Upload additional files to build your knowledge base\n\nAnything else you'd like me to help with?`
    };
    
    setMessages(prev => [...prev, completionMessage]);
    speakMessageWithElevenLabs(`Perfect! I've created comprehensive notes from ${fileName}. They're now saved in your Notes Manager for future reference.`);
    
    toast({
      title: "Notes Created! 📝",
      description: `Comprehensive notes saved from ${fileName}`
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // File size check (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: `📎 Uploaded: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`
    };
    setMessages(prev => [...prev, userMessage]);

    // Start processing
    speakMessageWithElevenLabs("I'll analyze this file for you! Let me see what we can do with it.");
    await processFileContent(file);
  };

  const processFileWithActions = async (actions: string[]) => {
    if (!currentFile || !fileAnalysis) return;

    setIsLoading(true);
    const results: string[] = [];

    try {
      const fileName = (currentFile as any).name;
      const content = (currentFile as any).content || '';
      const scheduleItems = (currentFile as any).scheduleItems || [];

      // Process based on selected actions
      for (const action of actions) {
        switch (action) {
          case 'schedule':
            if (scheduleItems.length > 0) {
              onScheduleUpdate(scheduleItems);
              results.push(`✅ Added ${scheduleItems.length} items to your Schedule Manager`);
            }
            break;

          case 'flashcards':
            const flashcards = await generateFlashcards(content);
            if (flashcards.length > 0) {
              onFlashcardsUpdate(flashcards);
              results.push(`📚 Created ${flashcards.length} flashcards`);
            }
            break;

          case 'fun-learning':
            const funContent = await generateFunLearning(content, 'interactive-story');
            onFunLearningUpdate(funContent, 'story');
            results.push(`🎯 Created fun learning content`);
            break;

          case 'auto-all':
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
        role: 'assistant',
        content: `🎉 **Processing Complete!** 🎉\n\n**${fileName}** has been successfully processed:\n\n${results.map(r => r).join('\n')}\n📝 Notes: ✅ Already saved\n\n**Everything is ready!** You can now:\n• Review items in their respective sections\n• Upload more files to continue building your study materials\n• Ask me questions about the content\n\nWhat would you like to do next?`
      };
      setMessages(prev => [...prev, successMessage]);
      speakMessageWithElevenLabs(`Perfect! I've processed everything from ${fileName}. ${results.length} actions completed successfully!`);

      toast({
        title: "🎉 Processing Complete!",
        description: results.join(', ')
      });

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Error",
        description: "Some items could not be processed. Please try again.",
        variant: "destructive"
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
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-[80%] p-3 ${
              message.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              <div className="flex items-start gap-2">
                {message.role === 'assistant' && (
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
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
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
            <Mic className={`w-4 h-4 mr-2 ${isListening ? 'animate-pulse' : ''}`} />
            {isListening ? 'Listening...' : 'Voice Input'}
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
                      <div className="font-medium text-sm">{(currentFile as any).name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{fileAnalysis.summary}</div>
                    </div>
                    
                    {fileAnalysis.hasScheduleData && (currentFile as any).scheduleItems && (
                      <div className="p-3 border rounded-lg">
                        <div className="font-medium text-sm mb-2">📅 Schedule Items Found:</div>
                        <div className="text-xs space-y-1">
                          {(currentFile as any).scheduleItems.slice(0, 2).map((item: any, i: number) => (
                            <div key={i} className="text-muted-foreground">
                              • {item.title} - {item.dueDate}
                            </div>
                          ))}
                          {(currentFile as any).scheduleItems.length > 2 && (
                            <div className="text-muted-foreground">
                              ... and {(currentFile as any).scheduleItems.length - 2} more
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
              <div className="text-sm font-medium">What would you like me to do?</div>
              
              <div className="grid gap-3">
                {fileAnalysis?.hasScheduleData && (currentFile as any)?.scheduleItems?.length > 0 && (
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => processFileWithActions(['schedule'])}
                  >
                    <Calendar className="w-5 h-5 mr-3 text-blue-500" />
                    <div className="text-left">
                      <div className="font-medium">Add to Schedule Manager</div>
                      <div className="text-xs text-muted-foreground">
                        Add {(currentFile as any)?.scheduleItems?.length} items to your calendar
                      </div>
                    </div>
                  </Button>
                )}
                
                {fileAnalysis?.hasEducationalContent && (
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => processFileWithActions(['flashcards'])}
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
                    onClick={() => processFileWithActions(['fun-learning'])}
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
                    onClick={() => processFileWithActions(['auto-all'])}
                  >
                    <div className="text-center">
                      <div className="font-medium">🚀 Do Everything Automatically</div>
                      <div className="text-xs opacity-90 mt-1">
                        Process all detected content types
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                💡 Notes are automatically created for all files and saved to Notes Manager
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
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
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Calendar, Tag, Trash2 } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  createdAt: string;
  tags: string[];
}

interface NotesManagerProps {
  notes?: Note[];
}

const NotesManager = ({ notes: externalNotes = [] }: NotesManagerProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (externalNotes.length > 0) {
      setNotes(prev => [...prev, ...externalNotes]);
    }
  }, [externalNotes]);

  const categories = ['all', 'general', 'lecture', 'assignment', 'research', 'meeting'];

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    const note: Note = {
      id: Date.now().toString(),
      title: newNote.title,
      content: newNote.content,
      source: 'manual',
      category: newNote.category,
      createdAt: new Date().toISOString(),
      tags: newNote.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    };

    setNotes(prev => [note, ...prev]);
    setNewNote({ title: '', content: '', category: 'general', tags: '' });
    setIsCreating(false);
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      lecture: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      assignment: 'bg-red-500/10 text-red-600 border-red-500/20',
      research: 'bg-green-500/10 text-green-600 border-green-500/20',
      meeting: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      general: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    };
    return colors[category] || colors.general;
  };

  return (
    <Card className="h-full cyber-glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Notes Manager
            </CardTitle>
            <CardDescription>
              AI-generated and manual notes from your study materials
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreating(!isCreating)}>
            {isCreating ? 'Cancel' : 'New Note'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-md border border-input bg-background"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Create Note Form */}
        {isCreating && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Note title..."
                value={newNote.title}
                onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="Note content..."
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
              <div className="flex gap-2">
                <select
                  value={newNote.category}
                  onChange={(e) => setNewNote(prev => ({ ...prev, category: e.target.value }))}
                  className="px-3 py-2 rounded-md border border-input bg-background"
                >
                  {categories.slice(1).map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Tags (comma separated)"
                  value={newNote.tags}
                  onChange={(e) => setNewNote(prev => ({ ...prev, tags: e.target.value }))}
                  className="flex-1"
                />
              </div>
              <Button onClick={addNote} className="w-full">
                Save Note
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Notes List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notes found. Upload files or create notes manually.</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{note.title}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNote(note.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {note.content}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(note.category)}>
                        {note.category}
                      </Badge>
                      {note.source === 'ai' && (
                        <Badge variant="outline" className="text-primary">
                          AI Generated
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {note.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Tag className="w-2 h-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotesManager;
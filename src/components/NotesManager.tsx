import { useState, useEffect } from "react";
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

  // Load notes from localStorage on component mount
  useEffect(() => {
    const loadedNotes = NotesStorage.load();
    setNotes(loadedNotes);
  }, []);

  useEffect(() => {
    if (externalNotes.length > 0) {
      setNotes((prev) => {
        const updatedNotes = [...prev, ...externalNotes];
        // Save external notes to localStorage
        NotesStorage.addBatch(externalNotes);
        return updatedNotes;
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
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Enhanced Study Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1
                    className="text-2xl font-bold text-primary mt-4 mb-2"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className="text-xl font-bold text-primary/90 mt-4 mb-2"
                    {...props}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    className="text-lg font-bold text-primary/80 mt-3 mb-1"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc ml-4 my-2" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal ml-4 my-2" {...props} />
                ),
                li: ({ node, ...props }) => <li className="my-1" {...props} />,
                p: ({ node, ...props }) => (
                  <p className="my-2 text-foreground" {...props} />
                ),
                code: ({ node, ...props }) => (
                  <code
                    className="px-1 py-0.5 bg-muted rounded text-foreground"
                    {...props}
                  />
                ),
                pre: ({ node, ...props }) => (
                  <pre
                    className="p-3 bg-muted rounded overflow-auto my-3"
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong
                    className="font-bold text-primary-foreground"
                    {...props}
                  />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-primary/30 pl-4 italic my-3"
                    {...props}
                  />
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
      {currentView === "subjects" && renderSubjectsView()}
      {currentView === "category" && renderCategoryView()}
      {currentView === "note" && renderNoteView()}
    </div>
  );
};

export default NotesManager;

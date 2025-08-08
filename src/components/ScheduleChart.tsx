import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Plus,
  X,
  BookOpen,
  GraduationCap,
  FileText,
  AlertTriangle,
  Grid,
  List,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CalendarView from "./CalendarView";

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  date: string;
  type: "assignment" | "study" | "exam" | "note" | "class" | "project";
  priority?: "high" | "medium" | "low";
  source?: string;
}

interface ScheduleChartProps {
  scheduleItems?: any[];
}

const ScheduleChart = ({
  scheduleItems: externalItems = [],
}: ScheduleChartProps) => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [currentView, setCurrentView] = useState<"list" | "calendar">(
    "calendar"
  );
  const [newItem, setNewItem] = useState({
    title: "",
    time: "",
    date: "",
    type: "study" as const,
  });
  const { toast } = useToast();

  // Load external items when they change
  useEffect(() => {
    if (externalItems.length > 0) {
      const formattedItems: ScheduleItem[] = externalItems.map((item) => ({
        id: item.id || `ext-${Date.now()}-${Math.random()}`,
        title: item.title,
        time: item.time || "12:00",
        date: item.date || new Date().toISOString().split("T")[0],
        type: item.type || "study",
        priority: "medium",
        source: "uploaded",
      }));

      setScheduleItems((prev) => [...prev, ...formattedItems]);

      toast({
        title: "📅 Schedule Extracted!",
        description: `Added ${externalItems.length} items to your calendar`,
        duration: 3000,
      });
    }
  }, [externalItems, toast]);

  const addScheduleItem = () => {
    if (newItem.title && newItem.time && newItem.date) {
      const item: ScheduleItem = {
        id: Date.now().toString(),
        ...newItem,
        priority: "medium",
        source: "manual",
      };

      setScheduleItems([...scheduleItems, item]);
      setNewItem({ title: "", time: "", date: "", type: "study" });

      toast({
        title: "✅ Added to schedule",
        description: `${item.title} scheduled successfully!`,
      });
    }
  };

  const removeItem = (id: string) => {
    setScheduleItems(scheduleItems.filter((item) => item.id !== id));
    toast({
      title: "Removed from schedule",
      description: "Item deleted successfully",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <FileText className="h-4 w-4" />;
      case "exam":
        return <GraduationCap className="h-4 w-4" />;
      case "study":
        return <BookOpen className="h-4 w-4" />;
      case "class":
        return <Clock className="h-4 w-4" />;
      case "project":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "assignment":
        return "bg-red-500/20 text-red-300 border-red-500/50";
      case "exam":
        return "bg-orange-500/20 text-orange-300 border-orange-500/50";
      case "study":
        return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      case "class":
        return "bg-green-500/20 text-green-300 border-green-500/50";
      case "project":
        return "bg-purple-500/20 text-purple-300 border-purple-500/50";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  const sortedItems = [...scheduleItems].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Convert schedule items to calendar items format
  const calendarItems = scheduleItems.map((item) => ({
    id: item.id,
    title: item.title,
    date: item.date,
    time: item.time,
    type: item.type,
    priority: item.priority || "medium",
    source: item.source,
  }));

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <Card className="cyber-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Schedule Manager
              <Badge
                variant="outline"
                className="ml-2 bg-primary/20 text-primary border-primary/50"
              >
                {scheduleItems.length} items
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={currentView === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView("calendar")}
                className="flex items-center gap-2"
              >
                <Grid className="w-4 h-4" />
                Calendar
              </Button>
              <Button
                variant={currentView === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView("list")}
                className="flex items-center gap-2"
              >
                <List className="w-4 h-4" />
                List
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Add New Item Form */}
      <Card className="cyber-glow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add New Schedule Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <Input
                placeholder="Task title..."
                value={newItem.title}
                onChange={(e) =>
                  setNewItem({ ...newItem, title: e.target.value })
                }
                className="bg-background/50 border-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <Input
                type="date"
                value={newItem.date}
                onChange={(e) =>
                  setNewItem({ ...newItem, date: e.target.value })
                }
                className="bg-background/50 border-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <Input
                type="time"
                value={newItem.time}
                onChange={(e) =>
                  setNewItem({ ...newItem, time: e.target.value })
                }
                className="bg-background/50 border-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <Select
                value={newItem.type}
                onValueChange={(value: any) =>
                  setNewItem({ ...newItem, type: value })
                }
              >
                <SelectTrigger className="bg-background/50 border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">📝 Assignment</SelectItem>
                  <SelectItem value="exam">🎓 Exam</SelectItem>
                  <SelectItem value="study">📚 Study</SelectItem>
                  <SelectItem value="class">🏫 Class</SelectItem>
                  <SelectItem value="project">🔧 Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button onClick={addScheduleItem} className="w-full cyber-glow">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar or List View */}
      {currentView === "calendar" ? (
        <CalendarView items={calendarItems} />
      ) : (
        <Card className="cyber-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5 text-primary" />
              Schedule List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="cyber-glow rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center bg-primary/10">
                  <Calendar className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  No schedule items yet
                </h3>
                <p className="text-sm mb-4">
                  Upload a file with schedule data or add items manually to get
                  started!
                </p>
                <div className="flex items-center justify-center gap-2 text-primary">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">
                    Upload files to extract schedules automatically
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-lg border border-primary/20 transition-all hover:shadow-lg hover:shadow-primary/20 bg-card/80 cyber-glow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getTypeIcon(item.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(item.date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {item.time}
                            </span>
                            {item.source && (
                              <Badge variant="outline" className="text-xs">
                                {item.source === "uploaded"
                                  ? "📁 From file"
                                  : "✏️ Manual"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={`${getTypeColor(item.type)} shadow-lg`}
                          variant="outline"
                        >
                          {item.type}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScheduleChart;

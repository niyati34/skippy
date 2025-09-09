import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bell,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScheduleStorage } from "@/lib/storage";

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  type:
    | "assignment"
    | "exam"
    | "study"
    | "reminder"
    | "class"
    | "project"
    | "note";
  priority: "high" | "medium" | "low";
  description?: string;
  source?: string; // Track if it came from file upload
}

interface CalendarViewProps {
  items: CalendarItem[];
  onItemsUpdate?: (items: CalendarItem[]) => void;
}

const CalendarView = ({ items = [], onItemsUpdate }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const { toast } = useToast();

  // Load items from storage and merge with external items
  useEffect(() => {
    const storedItems = ScheduleStorage.load();
    const formattedStoredItems: CalendarItem[] = storedItems.map((item) => ({
      id: item.id,
      title: item.title,
      date: item.date, // Stored as YYYY-MM-DD
      time: item.time, // Stored as HH:mm
      type:
        (item as any).type &&
        [
          "assignment",
          "exam",
          "study",
          "reminder",
          "class",
          "project",
          "note",
        ].includes((item as any).type)
          ? ((item as any).type as CalendarItem["type"])
          : ("study" as const),
      priority: "medium",
      description: `Scheduled item`,
      source: "storage",
    }));

    // Merge external items with stored items
    const externalItems: CalendarItem[] = items.map((item) => ({
      ...item,
      source: item.source || "external",
    }));

    const allItems = [...formattedStoredItems, ...externalItems];
    setCalendarItems(allItems);
  }, [items]);

  // Save to storage when items update
  useEffect(() => {
    if (onItemsUpdate) {
      onItemsUpdate(calendarItems);
    }
  }, [calendarItems, onItemsUpdate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getItemsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarItems.filter((item) => item.date === dateStr);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "assignment":
        return "bg-red-500/20 text-red-300 border-red-500/50 shadow-red-500/20";
      case "exam":
        return "bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-orange-500/20";
      case "study":
        return "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-blue-500/20";
      case "class":
        return "bg-green-500/20 text-green-300 border-green-500/50 shadow-green-500/20";
      case "project":
        return "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-purple-500/20";
      case "note":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-yellow-500/20";
      case "reminder":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-cyan-500/20";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/50 shadow-gray-500/20";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <FileText className="w-3 h-3" />;
      case "exam":
        return <GraduationCap className="w-3 h-3" />;
      case "study":
        return <BookOpen className="w-3 h-3" />;
      case "class":
        return <Clock className="w-3 h-3" />;
      case "project":
        return <AlertTriangle className="w-3 h-3" />;
      case "note":
        return <FileText className="w-3 h-3" />;
      case "reminder":
        return <Bell className="w-3 h-3" />;
      default:
        return <Calendar className="w-3 h-3" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case "medium":
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case "low":
        return <Bell className="w-3 h-3 text-green-500" />;
      default:
        return null;
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    );
  };

  const isDueToday = (item: CalendarItem) => {
    const today = new Date().toISOString().split("T")[0];
    return item.date === today;
  };

  const isDueSoon = (item: CalendarItem) => {
    const today = new Date();
    const itemDate = new Date(item.date);
    const diffTime = itemDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const days = getDaysInMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Get upcoming items for sidebar
  const upcomingItems = calendarItems
    .filter((item) => new Date(item.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-2">
        <Card className="cyber-glow animate-scale-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {monthYear}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (!day) {
                  return (
                    <div key={`empty-${index}`} className="p-2 h-20"></div>
                  );
                }

                const dayItems = getItemsForDate(day);
                const isSelectedDate =
                  selectedDate ===
                  `${currentDate.getFullYear()}-${String(
                    currentDate.getMonth() + 1
                  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                return (
                  <div
                    key={`day-${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`}
                    className={`
                      p-1 h-20 border rounded-lg cursor-pointer transition-all
                      ${
                        isToday(day)
                          ? "bg-primary/20 border-primary"
                          : "hover:bg-muted/50"
                      }
                      ${isSelectedDate ? "ring-2 ring-primary" : ""}
                    `}
                    onClick={() =>
                      setSelectedDate(
                        `${currentDate.getFullYear()}-${String(
                          currentDate.getMonth() + 1
                        ).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                      )
                    }
                  >
                    <div className="text-sm font-medium mb-1">{day}</div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className={`text-xs p-1 rounded truncate ${getTypeColor(
                            item.type
                          )}`}
                          title={item.title}
                        >
                          {item.title}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayItems.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Today's Items */}
        <Card className="cyber-glow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Due Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {calendarItems.filter(isDueToday).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing due today! 🎉
              </p>
            ) : (
              calendarItems.filter(isDueToday).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  {getPriorityIcon(item.priority)}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.time && (
                      <div className="text-xs text-muted-foreground">
                        {item.time}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Items */}
        <Card className="cyber-glow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming items</p>
            ) : (
              upcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20"
                >
                  {getPriorityIcon(item.priority)}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(item.date)}
                      {item.time && ` at ${item.time}`}
                    </div>
                  </div>
                  <Badge className={getTypeColor(item.type)} variant="outline">
                    {item.type}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="cyber-glow">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Items:</span>
                <span className="font-medium">{calendarItems.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Due Soon:</span>
                <span className="font-medium text-orange-600">
                  {calendarItems.filter(isDueSoon).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>High Priority:</span>
                <span className="font-medium text-red-600">
                  {
                    calendarItems.filter((item) => item.priority === "high")
                      .length
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarView;

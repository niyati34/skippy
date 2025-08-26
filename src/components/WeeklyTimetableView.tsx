import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bell,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  FileText,
  Coffee,
  MapPin,
  Trash2,
  Edit,
  Settings,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ScheduleStorage,
  TimetableStorage,
  TimetableClass,
  detectConflicts,
} from "@/lib/storage";

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  type:
    | "assignment"
    | "exam"
    | "study"
    | "reminder"
    | "class"
    | "project"
    | "note"
    | "break";
  priority: "high" | "medium" | "low";
  description?: string;
  room?: string;
  source?: string;
  instructor?: string;
  recurring?: boolean;
}

interface CalendarViewProps {
  items: CalendarItem[];
  onItemsUpdate?: (items: CalendarItem[]) => void;
}

const WeeklyTimetableView = ({
  items = [],
  onItemsUpdate,
}: CalendarViewProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflictBanner, setShowConflictBanner] = useState(true);
  const { toast } = useToast();

  // Time slots for the weekly view
  const timeSlots = [
    "07:30",
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
  ];

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Load items from storage and merge with external items
  useEffect(() => {
    const storedItems = ScheduleStorage.load();
    // Convert stored items to CalendarItem format
    const convertedStored = storedItems.map((item) => ({
      ...item,
      priority: (item as any).priority || ("medium" as const),
      recurring: (item as any).recurring || false,
    }));

    console.log("📅 Loading timetable for current week...");

    // Generate timetable instances for the current week with specific dates
    const weeklyTimetableItems = generateTimetableInstancesForWeek();

    const allItems = [...convertedStored, ...items, ...weeklyTimetableItems];

    // Remove duplicates based on title, date, and time
    const uniqueItems = allItems.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (i) =>
            i.title === item.title &&
            i.date === item.date &&
            i.time === item.time
        )
    );

    console.log("📅 Total calendar items loaded:", uniqueItems.length);
    setCalendarItems(uniqueItems);

    // Detect conflicts for the week
    const weekConflicts = detectConflicts(uniqueItems);
    setConflicts(weekConflicts);
  }, [items, currentWeek]); // Re-generate when week changes

  // Save to storage when items update
  useEffect(() => {
    if (calendarItems.length > 0) {
      // Convert to storage format
      const storageItems = calendarItems.map((item) => ({
        id: item.id,
        title: item.title,
        time: item.time || "00:00",
        date: item.date,
        type:
          item.type === "class" ||
          item.type === "break" ||
          item.type === "reminder" ||
          item.type === "project"
            ? ("study" as const)
            : (item.type as "assignment" | "study" | "exam" | "note"),
        source: item.source,
        createdAt: new Date().toISOString(),
      }));
      ScheduleStorage.save(storageItems);
    }
  }, [calendarItems]);

  // Notify parent of items update (separate effect to avoid infinite loop)
  useEffect(() => {
    if (calendarItems.length > 0) {
      onItemsUpdate?.(calendarItems);
    }
  }, [calendarItems.length]); // Only trigger when the count changes, not the items themselves

  // Generate timetable instances for the current week with specific dates
  const generateTimetableInstancesForWeek = (): CalendarItem[] => {
    const timetableInstances: CalendarItem[] = [];
    const weekStart = getWeekStart(currentWeek);
    const timetableData = TimetableStorage.load();

    console.log(
      "📅 Generating timetable for week starting:",
      weekStart.toDateString()
    );

    // Generate instances for each day of the current week
    days.forEach((dayName, dayIndex) => {
      const dayClasses =
        timetableData[dayName as keyof typeof timetableData] || [];

      // Calculate the actual date for this day in the current week
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayIndex);
      const dayDateStr = dayDate.toISOString().split("T")[0];

      console.log(
        `📅 ${dayName} (${dayDateStr}): ${dayClasses.length} classes`
      );

      // Create calendar items for each class on this day
      dayClasses.forEach((cls: TimetableClass) => {
        const instance: CalendarItem = {
          id: `${cls.id}-${dayDateStr}`, // Unique ID for this week instance
          title: cls.title,
          date: dayDateStr, // Specific date for this week
          time: cls.time,
          endTime: cls.endTime,
          type: "class" as const,
          priority: "medium" as const,
          description: `${cls.type || "Class"} - ${dayName}${
            cls.room ? ` in ${cls.room}` : ""
          }${cls.instructor ? ` with ${cls.instructor}` : ""}`,
          room: cls.room,
          instructor: cls.instructor,
          recurring: true,
          source: cls.source || "Weekly Timetable",
        };

        timetableInstances.push(instance);
        console.log(
          `  ⏰ ${cls.time} - ${cls.title} in ${cls.room || "Room TBD"}`
        );
      });
    });

    console.log(
      "📅 Generated",
      timetableInstances.length,
      "timetable instances for current week"
    );
    return timetableInstances;
  };

  // Get start of current week (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday = 1
    return new Date(d.setDate(diff));
  };

  // Get week dates
  const getWeekDates = () => {
    const start = getWeekStart(currentWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  };

  // Get items for specific date and time
  const getItemsForSlot = (day: string, timeSlot: string) => {
    const currentWeekDates = getWeekDates();
    const targetDate = currentWeekDates.find((d) => {
      const dayName = days[d.getDay() === 0 ? 6 : d.getDay() - 1];
      return dayName === day;
    });

    if (!targetDate) return [];

    const targetDateStr = targetDate.toISOString().split("T")[0];

    console.log(
      `🔍 Looking for items on ${day} (${targetDateStr}) at ${timeSlot}`
    );

    const matchingItems = calendarItems.filter((item) => {
      if (!item.time) return false;

      // Match exact date
      if (item.date !== targetDateStr) {
        return false;
      }

      const itemTime = item.time.replace(/[^\d:]/g, "").substring(0, 5);
      const slotTime = timeSlot;

      // Check if item falls within this time slot
      const itemMinutes =
        parseInt(itemTime.split(":")[0]) * 60 +
        parseInt(itemTime.split(":")[1]);
      const slotMinutes =
        parseInt(slotTime.split(":")[0]) * 60 +
        parseInt(slotTime.split(":")[1]);

      // Match if item starts within 30 minutes of this slot
      const timeDiff = Math.abs(itemMinutes - slotMinutes);
      const matches = timeDiff <= 30;

      if (matches) {
        console.log(`  ✅ Found: ${item.title} at ${item.time} (${item.date})`);
      }

      return matches;
    });

    return matchingItems;
  };

  // Get items for a specific day
  const getItemsForDay = (day: string) => {
    const currentWeekDates = getWeekDates();
    const targetDate = currentWeekDates.find((d) => {
      const dayName = days[d.getDay() === 0 ? 6 : d.getDay() - 1];
      return dayName === day;
    });

    if (!targetDate) return [];

    const targetDateStr = targetDate.toISOString().split("T")[0];

    const dayItems = calendarItems
      .filter((item) => {
        return item.date === targetDateStr;
      })
      .sort((a, b) => {
        const timeA = a.time?.replace(/[^\d:]/g, "") || "00:00";
        const timeB = b.time?.replace(/[^\d:]/g, "") || "00:00";
        return timeA.localeCompare(timeB);
      });

    console.log(`📅 ${day} (${targetDateStr}): ${dayItems.length} items`);
    return dayItems;
  };

  // Get today's items
  const getTodayItems = () => {
    const today = new Date().toISOString().split("T")[0];
    return calendarItems
      .filter((item) => item.date === today)
      .sort((a, b) => {
        const timeA = a.time?.replace(/[^\d:]/g, "") || "00:00";
        const timeB = b.time?.replace(/[^\d:]/g, "") || "00:00";
        return timeA.localeCompare(timeB);
      });
  };

  // Get due items
  const getDueItems = () => {
    const today = new Date().toISOString().split("T")[0];
    return calendarItems.filter(
      (item) =>
        (item.type === "assignment" || item.type === "exam") &&
        item.date === today
    );
  };

  // Get upcoming items
  const getUpcomingItems = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return calendarItems
      .filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate > today && itemDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "class":
        return "bg-blue-500/20 text-blue-700 border-blue-300";
      case "exam":
        return "bg-red-500/20 text-red-700 border-red-300";
      case "assignment":
        return "bg-orange-500/20 text-orange-700 border-orange-300";
      case "study":
        return "bg-green-500/20 text-green-700 border-green-300";
      case "break":
        return "bg-gray-500/20 text-gray-700 border-gray-300";
      default:
        return "bg-purple-500/20 text-purple-700 border-purple-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "class":
        return <BookOpen className="w-3 h-3" />;
      case "exam":
        return <AlertTriangle className="w-3 h-3" />;
      case "assignment":
        return <FileText className="w-3 h-3" />;
      case "study":
        return <GraduationCap className="w-3 h-3" />;
      case "break":
        return <Coffee className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    return time.replace(/(\d{1,2}):(\d{2})/, "$1:$2");
  };

  const formatDateForDisplay = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    return {
      dayName: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
      dayNumber: date.getDate(),
      isToday,
    };
  };

  // Delete individual schedule item
  const deleteScheduleItem = (itemId: string) => {
    // Remove from local state
    const updatedItems = calendarItems.filter((item) => item.id !== itemId);
    setCalendarItems(updatedItems);

    // Remove from regular schedule storage
    ScheduleStorage.remove(itemId);

    // Check if this is a timetable class and remove from timetable storage too
    const itemToDelete = calendarItems.find((item) => item.id === itemId);
    if (
      itemToDelete &&
      (itemToDelete.recurring || itemToDelete.type === "class")
    ) {
      // Extract the base ID (remove the date suffix for weekly instances)
      const baseId = itemId.split("-")[0];
      TimetableStorage.removeClass(baseId);
    }

    // Notify parent
    onItemsUpdate?.(updatedItems);

    toast({
      title: "Item deleted! 🗑️",
      description: "Schedule item removed successfully.",
    });
  };

  // Delete all schedule items
  const deleteAllScheduleItems = () => {
    setCalendarItems([]);
    ScheduleStorage.save([]);
    onItemsUpdate?.([]);

    toast({
      title: "All items deleted! 🗑️",
      description: "All schedule items have been removed.",
    });
  };

  // Delete all timetable/recurring items only
  const deleteTimetableItems = () => {
    const nonTimetableItems = calendarItems.filter((item) => {
      const isRecurring = item.recurring === true;
      const isClassType = item.type === "class";
      const hasClassKeywords =
        item.title?.toLowerCase().includes("class") ||
        item.title?.toLowerCase().includes("lecture") ||
        item.title?.toLowerCase().includes("lab") ||
        item.title?.toLowerCase().includes("prof") ||
        item.title?.toLowerCase().includes("dr.");

      return !(isRecurring || isClassType || hasClassKeywords);
    });

    setCalendarItems(nonTimetableItems);

    // Clear day-wise timetable storage
    TimetableStorage.clearAll();

    // Update regular schedule storage
    const storageItems = nonTimetableItems.map((item) => ({
      id: item.id,
      title: item.title,
      time: item.time || "00:00",
      date: item.date,
      type:
        item.type === "class" ||
        item.type === "break" ||
        item.type === "reminder" ||
        item.type === "project"
          ? ("study" as const)
          : (item.type as "assignment" | "study" | "exam" | "note"),
      source: item.source,
      createdAt: new Date().toISOString(),
    }));
    ScheduleStorage.save(storageItems);

    onItemsUpdate?.(nonTimetableItems);

    toast({
      title: "Timetable cleared! 🗑️",
      description:
        "All timetable classes have been removed from day-wise storage.",
    });
  };

  const weekDates = getWeekDates();
  const todayItems = getTodayItems();
  const dueItems = getDueItems();
  const upcomingItems = getUpcomingItems();

  if (viewMode === "day" && selectedDay) {
    const dayItems = getItemsForDay(selectedDay);
    const selectedDate = weekDates.find(
      (d) => days[d.getDay() === 0 ? 6 : d.getDay() - 1] === selectedDay
    );

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("week")}
            >
              ← Back to Week View
            </Button>
            <h2 className="text-2xl font-bold text-primary">
              {selectedDay}, {selectedDate?.toLocaleDateString()}
            </h2>
          </div>
        </div>

        {/* Day Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {selectedDay}'s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No items scheduled for {selectedDay}
              </p>
            ) : (
              <div className="space-y-3">
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border-2 ${getTypeColor(
                      item.type
                    )}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getTypeIcon(item.type)}
                        <div>
                          <h4 className="font-semibold">{item.title}</h4>
                          <p className="text-sm opacity-75">
                            {formatTime(item.time)}{" "}
                            {item.endTime && `- ${formatTime(item.endTime)}`}
                          </p>
                          {item.room && (
                            <p className="text-sm opacity-75 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.room}
                            </p>
                          )}
                          {item.instructor && (
                            <p className="text-sm opacity-75">
                              {item.instructor}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {item.type}
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Schedule Item
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{item.title}"?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteScheduleItem(item.id)}
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
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conflict banner */}
      {showConflictBanner && conflicts.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="text-sm text-red-800">
              ⚠️ {conflicts.length} time conflict
              {conflicts.length > 1 ? "s" : ""} detected this week. Overlapping
              items share the same time.
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConflictBanner(false)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}
      {/* Debug Section - Remove in production */}
      {false && ( // Temporarily disabled
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-yellow-600">
              Debug: Schedule Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p>
                <strong>Total Items:</strong> {calendarItems.length}
              </p>
              <p>
                <strong>External Items Received:</strong> {items.length}
              </p>
              <p>
                <strong>Classes (type=class):</strong>{" "}
                {calendarItems.filter((i) => i.type === "class").length}
              </p>
              <p>
                <strong>Current Week:</strong> {currentWeek.toDateString()}
              </p>
              <p>
                <strong>Week Dates:</strong>{" "}
                {weekDates.map((d) => d.toDateString()).join(", ")}
              </p>

              {calendarItems.length > 0 && (
                <div>
                  <strong>All Items by Day:</strong>
                  <div className="space-y-1">
                    {days.map((day) => {
                      const dayItems = getItemsForDay(day);
                      return (
                        <div key={day} className="bg-gray-100 p-2 rounded">
                          <strong>{day}:</strong> {dayItems.length} items
                          {dayItems.map((item) => (
                            <div key={item.id} className="ml-4 text-xs">
                              • {item.title} at {item.time} (date: {item.date},
                              type: {item.type})
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-primary">Weekly Timetable</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const prev = new Date(currentWeek);
                prev.setDate(prev.getDate() - 7);
                setCurrentWeek(prev);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-3">
              Week of {getWeekStart(currentWeek).toLocaleDateString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = new Date(currentWeek);
                next.setDate(next.getDate() + 7);
                setCurrentWeek(next);
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Management Buttons */}
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-orange-600 hover:text-orange-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Clear Timetable
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Timetable Classes</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all timetable/recurring classes but keep
                  other schedule items. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteTimetableItems}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Clear Timetable
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Schedule Items</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all schedule items, assignments,
                  classes, and notes. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteAllScheduleItems}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">Due Today</h3>
              {dueItems.length === 0 ? (
                <p className="text-green-600 mt-2">Nothing due today! 🎉</p>
              ) : (
                <p className="text-red-600 mt-2">{dueItems.length} items due</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">Upcoming</h3>
              {upcomingItems.length === 0 ? (
                <p className="text-muted-foreground mt-2">No upcoming items</p>
              ) : (
                <p className="text-blue-600 mt-2">
                  {upcomingItems.length} upcoming
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">Total Items</h3>
              <p className="text-primary mt-2 text-xl font-bold">
                {calendarItems.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">High Priority</h3>
              <p className="text-orange-600 mt-2">
                {calendarItems.filter((i) => i.priority === "high").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left w-20 bg-muted">Time</th>
                  {weekDates.map((date) => {
                    const { dayName, dayNumber, isToday } =
                      formatDateForDisplay(date);
                    const dayConflicts = conflicts.filter(
                      (c) => c.date === date.toISOString().split("T")[0]
                    );
                    return (
                      <th
                        key={dayName}
                        className={`p-3 text-center cursor-pointer hover:bg-muted/50 transition-colors min-w-32 ${
                          isToday
                            ? "bg-primary/10 text-primary font-bold"
                            : "bg-muted"
                        }`}
                        onClick={() => {
                          setSelectedDay(dayName);
                          setViewMode("day");
                        }}
                      >
                        <div>
                          <div className="font-semibold">{dayName}</div>
                          <div className="text-sm opacity-75">{dayNumber}</div>
                          {dayConflicts.length > 0 && (
                            <div className="mt-1 text-xs text-red-700">
                              {dayConflicts.length} conflict
                              {dayConflicts.length > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot} className="border-b hover:bg-muted/20">
                    <td className="p-2 text-sm font-medium text-muted-foreground border-r">
                      {timeSlot}
                    </td>
                    {days.slice(0, 7).map((day) => {
                      const items = getItemsForSlot(day, timeSlot);
                      return (
                        <td
                          key={`${day}-${timeSlot}`}
                          className="p-1 border-r align-top"
                        >
                          <div className="space-y-1">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className={`text-xs p-2 rounded border ${getTypeColor(
                                  item.type
                                )} cursor-pointer hover:scale-105 transition-transform group relative`}
                                title={`${item.title} - ${item.time}${
                                  item.room ? ` (${item.room})` : ""
                                }`}
                              >
                                <div className="font-medium truncate">
                                  {item.title}
                                </div>
                                {item.room && (
                                  <div className="opacity-75 truncate">
                                    {item.room}
                                  </div>
                                )}

                                {/* Delete button - appears on hover */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute top-0 right-0 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete Schedule Item
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "
                                        {item.title}"? This action cannot be
                                        undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          deleteScheduleItem(item.id)
                                        }
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Today's Detailed Schedule */}
      {todayItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${getTypeColor(item.type)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.type)}
                      <div>
                        <h4 className="font-semibold">{item.title}</h4>
                        <p className="text-sm opacity-75">
                          {formatTime(item.time)}{" "}
                          {item.endTime && `- ${formatTime(item.endTime)}`}
                          {item.room && ` • ${item.room}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {item.type}
                    </Badge>
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

export default WeeklyTimetableView;

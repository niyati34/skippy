// Advanced Data Access Layer - Provides comprehensive access to all user data
// This enables the study buddy to be truly intelligent and context-aware

import {
  FlashcardStorage,
  NotesStorage,
  ScheduleStorage,
  BuddyMemoryStorage,
} from "./storage";
import type {
  StoredFlashcard,
  StoredNote,
  StoredScheduleItem,
  BuddyMemory,
} from "./storage";

export interface StudyContext {
  flashcards: StoredFlashcard[];
  notes: StoredNote[];
  schedule: StoredScheduleItem[];
  memory: BuddyMemory;
  stats: {
    totalFlashcards: number;
    totalNotes: number;
    upcomingEvents: number;
    studyStreak: number;
    favoriteTopics: string[];
  };
}

export interface QueryResult {
  type: "flashcards" | "notes" | "schedule" | "mixed";
  data: any[];
  summary: string;
  suggestions: string[];
}

export class StudyDataManager {
  // Get complete study context for intelligent responses
  getStudyContext(): StudyContext {
    const flashcards = FlashcardStorage.load();
    const notes = NotesStorage.load();
    const schedule = ScheduleStorage.load();
    const memory = BuddyMemoryStorage.load();

    // Calculate smart stats
    const now = new Date();
    const today = now.toDateString();
    const tomorrow = new Date(
      now.getTime() + 24 * 60 * 60 * 1000
    ).toDateString();

    const upcomingEvents = schedule.filter((item) => {
      const itemDate = new Date(item.date);
      return (
        itemDate >= now &&
        itemDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      );
    }).length;

    // Extract favorite topics from notes and flashcards
    const topicCounts = new Map<string, number>();
    [...notes, ...flashcards].forEach((item) => {
      const category = item.category || "general";
      topicCounts.set(category, (topicCounts.get(category) || 0) + 1);
    });

    const favoriteTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    return {
      flashcards,
      notes,
      schedule,
      memory,
      stats: {
        totalFlashcards: flashcards.length,
        totalNotes: notes.length,
        upcomingEvents,
        studyStreak: memory.messageCount || 0,
        favoriteTopics,
      },
    };
  }

  // Smart search across all data types
  searchAll(query: string): QueryResult {
    const context = this.getStudyContext();
    const lowerQuery = query.toLowerCase();

    // Search flashcards
    const matchingFlashcards = context.flashcards.filter(
      (card) =>
        card.question.toLowerCase().includes(lowerQuery) ||
        card.answer.toLowerCase().includes(lowerQuery) ||
        card.category.toLowerCase().includes(lowerQuery)
    );

    // Search notes
    const matchingNotes = context.notes.filter(
      (note) =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery) ||
        note.category.toLowerCase().includes(lowerQuery) ||
        (note.tags &&
          note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)))
    );

    // Search schedule
    const matchingSchedule = context.schedule.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.type.toLowerCase().includes(lowerQuery)
    );

    // Determine result type and create response
    const hasFlashcards = matchingFlashcards.length > 0;
    const hasNotes = matchingNotes.length > 0;
    const hasSchedule = matchingSchedule.length > 0;

    let type: QueryResult["type"] = "mixed";
    let data: any[] = [];
    let summary = "";
    let suggestions: string[] = [];

    if (hasFlashcards && !hasNotes && !hasSchedule) {
      type = "flashcards";
      data = matchingFlashcards;
      summary = `Found ${matchingFlashcards.length} flashcard(s) about "${query}"`;
      suggestions = [
        "Create more flashcards on this topic",
        "Study these flashcards now",
        "Create notes from these flashcards",
      ];
    } else if (hasNotes && !hasFlashcards && !hasSchedule) {
      type = "notes";
      data = matchingNotes;
      summary = `Found ${matchingNotes.length} note(s) about "${query}"`;
      suggestions = [
        "Create flashcards from these notes",
        "Review and expand these notes",
        "Schedule study time for this topic",
      ];
    } else if (hasSchedule && !hasFlashcards && !hasNotes) {
      type = "schedule";
      data = matchingSchedule;
      summary = `Found ${matchingSchedule.length} scheduled item(s) about "${query}"`;
      suggestions = [
        "Create study materials for this",
        "Set reminders",
        "Add more details",
      ];
    } else if (hasFlashcards || hasNotes || hasSchedule) {
      type = "mixed";
      data = [...matchingFlashcards, ...matchingNotes, ...matchingSchedule];
      summary = `Found ${data.length} item(s) about "${query}" across flashcards, notes, and schedule`;
      suggestions = [
        "Organize these into a study plan",
        "Create connections between topics",
        "Schedule review sessions",
      ];
    } else {
      summary = `No existing content found for "${query}"`;
      suggestions = [
        "Create new notes on this topic",
        "Generate flashcards",
        "Add to study schedule",
      ];
    }

    return { type, data, summary, suggestions };
  }

  // Answer schedule-related questions
  getScheduleInfo(timeQuery: string): {
    events: StoredScheduleItem[];
    summary: string;
  } {
    const schedule = ScheduleStorage.load();
    const now = new Date();

    const lowerQuery = timeQuery.toLowerCase();
    let targetDate: Date;
    let dateRange: { start: Date; end: Date };

    if (lowerQuery.includes("today")) {
      targetDate = now;
      dateRange = {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        end: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        ),
      };
    } else if (lowerQuery.includes("tomorrow")) {
      targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      dateRange = {
        start: new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate()
        ),
        end: new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          23,
          59,
          59
        ),
      };
    } else if (lowerQuery.includes("this week")) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      dateRange = { start: weekStart, end: weekEnd };
    } else if (lowerQuery.includes("next week")) {
      const nextWeekStart = new Date(now);
      nextWeekStart.setDate(now.getDate() + (7 - now.getDay()));
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
      dateRange = { start: nextWeekStart, end: nextWeekEnd };
    } else {
      // Default to upcoming events
      dateRange = {
        start: now,
        end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      };
    }

    const relevantEvents = schedule
      .filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= dateRange.start && itemDate <= dateRange.end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let summary: string;
    if (relevantEvents.length === 0) {
      summary = `No events scheduled for ${timeQuery}`;
    } else {
      const timeDesc = lowerQuery.includes("today")
        ? "today"
        : lowerQuery.includes("tomorrow")
        ? "tomorrow"
        : lowerQuery.includes("this week")
        ? "this week"
        : lowerQuery.includes("next week")
        ? "next week"
        : "the upcoming period";
      summary = `You have ${relevantEvents.length} event(s) ${timeDesc}`;
    }

    return { events: relevantEvents, summary };
  }

  // Get related content for making connections
  getRelatedContent(topic: string): {
    flashcards: StoredFlashcard[];
    notes: StoredNote[];
    suggestions: string[];
  } {
    const context = this.getStudyContext();
    const lowerTopic = topic.toLowerCase();

    const relatedFlashcards = context.flashcards.filter(
      (card) =>
        card.category.toLowerCase().includes(lowerTopic) ||
        card.question.toLowerCase().includes(lowerTopic) ||
        card.answer.toLowerCase().includes(lowerTopic)
    );

    const relatedNotes = context.notes.filter(
      (note) =>
        note.category.toLowerCase().includes(lowerTopic) ||
        note.title.toLowerCase().includes(lowerTopic) ||
        note.content.toLowerCase().includes(lowerTopic) ||
        (note.tags &&
          note.tags.some((tag) => tag.toLowerCase().includes(lowerTopic)))
    );

    const suggestions = [];
    if (relatedNotes.length > 0 && relatedFlashcards.length === 0) {
      suggestions.push(
        `Create flashcards from your ${relatedNotes.length} notes about ${topic}`
      );
    }
    if (relatedFlashcards.length > 0 && relatedNotes.length === 0) {
      suggestions.push(
        `Create detailed notes to support your ${relatedFlashcards.length} flashcards about ${topic}`
      );
    }
    if (relatedFlashcards.length > 0 || relatedNotes.length > 0) {
      suggestions.push(`Schedule a study session for ${topic}`);
      suggestions.push(`Create a quiz combining different aspects of ${topic}`);
    }

    return { flashcards: relatedFlashcards, notes: relatedNotes, suggestions };
  }

  // Get study recommendations based on data patterns
  getStudyRecommendations(): string[] {
    const context = this.getStudyContext();
    const recommendations = [];

    // Analyze study patterns
    if (context.stats.totalFlashcards > 20) {
      const categories = new Set(
        context.flashcards.map((card) => card.category)
      );
      if (categories.size > 3) {
        recommendations.push(
          "You have flashcards across multiple topics - consider creating mixed review sessions"
        );
      }
    }

    // Check for notes without flashcards
    const noteCategories = new Set(context.notes.map((note) => note.category));
    const flashcardCategories = new Set(
      context.flashcards.map((card) => card.category)
    );
    const notesWithoutFlashcards = [...noteCategories].filter(
      (cat) => !flashcardCategories.has(cat)
    );

    if (notesWithoutFlashcards.length > 0) {
      recommendations.push(
        `Create flashcards from your notes about: ${notesWithoutFlashcards
          .slice(0, 3)
          .join(", ")}`
      );
    }

    // Check upcoming events without study materials
    const { events } = this.getScheduleInfo("this week");
    const upcomingTopics = events.map((e) => e.title.toLowerCase());
    const studiedTopics = [...context.notes, ...context.flashcards].map(
      (item) => item.category.toLowerCase()
    );

    const unstudiedEvents = events.filter(
      (event) =>
        !studiedTopics.some((topic) =>
          event.title.toLowerCase().includes(topic)
        )
    );

    if (unstudiedEvents.length > 0) {
      recommendations.push(
        `Prepare materials for upcoming: ${unstudiedEvents[0].title}`
      );
    }

    // Encourage regular study habits
    if (context.stats.studyStreak < 5) {
      recommendations.push(
        "Build your study streak by reviewing flashcards daily"
      );
    }

    return recommendations.slice(0, 3); // Limit to top 3 recommendations
  }
}

// Singleton instance for global use
export const studyDataManager = new StudyDataManager();

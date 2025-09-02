// Tool Schemas and Toolbox descriptions for LLM planning
import { z } from "zod";

// Zod Schemas for actions
export const CreateFlashcardsSchema = z.object({
  topic: z.string().min(1, "topic required"),
  count: z.number().int().positive().max(200).default(10).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export const DeleteFlashcardSchema = z.object({
  // Can delete by id or by query/topic/timeframe
  flashcardId: z.string().optional(),
  topic: z.string().optional(),
  query: z.string().optional(),
  timeframe: z.string().optional(),
});

export const FindNotesSchema = z.object({
  query: z.string().min(1),
});

export const ScheduleStudySchema = z.object({
  availability: z.any().optional(),
  exams: z.any().optional(),
});

export const ParseTimetableSchema = z.object({
  source: z.string().optional(),
});

export const CheckFlashcardsSchema = z.object({
  topic: z.string().optional(),
  query: z.string().optional(),
  includeSamples: z.boolean().optional().default(true),
});

export type CreateFlashcardsArgs = z.infer<typeof CreateFlashcardsSchema>;
export type DeleteFlashcardArgs = z.infer<typeof DeleteFlashcardSchema>;
export type FindNotesArgs = z.infer<typeof FindNotesSchema>;
export type ScheduleStudyArgs = z.infer<typeof ScheduleStudySchema>;
export type ParseTimetableArgs = z.infer<typeof ParseTimetableSchema>;

export type ToolName =
  | "create_flashcards"
  | "delete_flashcards"
  | "find_notes"
  | "schedule_task"
  | "parse_timetable"
  | "check_flashcards";

export const ToolSchemas: Record<ToolName, z.ZodTypeAny> = {
  create_flashcards: CreateFlashcardsSchema,
  delete_flashcards: DeleteFlashcardSchema,
  find_notes: FindNotesSchema,
  schedule_task: ScheduleStudySchema,
  parse_timetable: ParseTimetableSchema,
  check_flashcards: CheckFlashcardsSchema,
};

export function getToolboxDescriptions(): string {
  return [
    'create_flashcards(topic, count?) - Generate flashcards for a topic. "count" defaults to 10 if omitted.',
    'delete_flashcards(flashcardId?|topic?|query?, timeframe?) - Delete a single card by ID or cards matching a topic/query. Use timeframe like "yesterday" if relevant.',
    "find_notes(query) - Search existing notes using a semantic query.",
    "schedule_task(availability?, exams?) - Plan study tasks based on availability and upcoming exams.",
    "parse_timetable(source?) - Parse timetable from uploaded files or given text.",
    "check_flashcards(topic?|query?, includeSamples?) - Report how many flashcards exist, optionally filtered, and return small samples.",
  ].join("\n");
}

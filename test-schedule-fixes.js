// Test script for schedule Q&A and typo handling fixes
import {
  Orchestrator,
  BuddyAgent,
  CommandAgent,
  NotesAgent,
  PlannerAgent,
  FlashcardAgent,
  FunAgent,
} from "./src/lib/agent.ts";

const agents = [
  new BuddyAgent(),
  new CommandAgent(),
  new NotesAgent(),
  new PlannerAgent(),
  new FlashcardAgent(),
  new FunAgent(),
];

const orch = new Orchestrator(agents);

// Test cases
const testCases = [
  // Schedule Q&A tests
  {
    name: "Schedule Q&A - exam tomorrow",
    input: "do I have exam tomorrow?",
    expectsScheduleCheck: true,
  },
  {
    name: "Schedule Q&A - what do I have today",
    input: "what do I have today?",
    expectsScheduleCheck: true,
  },
  {
    name: "Schedule Q&A - exam today",
    input: "exam today?",
    expectsScheduleCheck: true,
  },

  // Typo handling tests
  {
    name: "Typo handling - chedule",
    input: "make a chedule for tomorrow",
    expectsScheduleCreation: true,
  },
  {
    name: "Typo handling - shedule",
    input: "create shedule for next week",
    expectsScheduleCreation: true,
  },
  {
    name: "Typo handling - scedule",
    input: "scedule my classes",
    expectsScheduleCreation: true,
  },
];

async function runTests() {
  console.log("🧪 Running Schedule Q&A and Typo Handling Tests\n");

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`💬 Input: "${testCase.input}"`);

    try {
      const result = await orch.handle({ text: testCase.input });
      console.log(`✅ Result: ${result.summary}`);

      if (testCase.expectsScheduleCheck) {
        if (
          result.summary.includes("schedule") ||
          result.summary.includes("nothing") ||
          result.summary.includes("item")
        ) {
          console.log("✅ Schedule Q&A working correctly");
        } else {
          console.log("❌ Schedule Q&A may not be working");
        }
      }

      if (testCase.expectsScheduleCreation) {
        if (
          result.artifacts?.schedule ||
          result.summary.includes("schedule") ||
          result.summary.includes("created")
        ) {
          console.log("✅ Schedule creation with typo working correctly");
        } else {
          console.log("❌ Schedule creation with typo may not be working");
        }
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

// Run the tests
runTests().catch(console.error);

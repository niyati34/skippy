// Test schedule Q&A and typo handling with actual localStorage
console.log("🧪 TESTING SCHEDULE Q&A AND TYPO FIXES");

// First, let's add some test data to localStorage
const testScheduleData = [
  {
    id: "test-exam-1",
    title: "Blockchain Technology Exam",
    type: "exam",
    date: "2025-08-28", // Tomorrow (assuming today is 2025-08-27)
    time: "09:00",
    endTime: "11:00",
    source: "Test Data",
  },
  {
    id: "test-class-1",
    title: "AI Lecture",
    type: "class",
    date: "2025-08-27", // Today
    time: "14:00",
    endTime: "15:30",
    source: "Test Data",
  },
];

// Save test data
localStorage.setItem("skippy-schedule", JSON.stringify(testScheduleData));
console.log("✅ Added test schedule data:", testScheduleData);

// Import the orchestrator
import {
  Orchestrator,
  BuddyAgent,
  CommandAgent,
  NotesAgent,
  PlannerAgent,
  FlashcardAgent,
  FunAgent,
} from "./src/lib/agent.js";

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
async function runComprehensiveTests() {
  console.log("🚀 Running comprehensive tests...\n");

  // Test 1: Schedule Q&A
  console.log("📅 TEST 1: Schedule Q&A");
  try {
    const result1 = await orch.handle({ text: "do I have exam tomorrow?" });
    console.log("Result:", result1.summary);

    const result2 = await orch.handle({ text: "what do I have today?" });
    console.log("Result:", result2.summary);

    const result3 = await orch.handle({ text: "exam today?" });
    console.log("Result:", result3.summary);
  } catch (error) {
    console.error("❌ Schedule Q&A test failed:", error);
  }

  // Test 2: Typo handling
  console.log("\n🔤 TEST 2: Typo Handling");
  try {
    const result4 = await orch.handle({
      text: "make a chedule for tomorrow 10am math class",
    });
    console.log("Result:", result4.summary);

    const result5 = await orch.handle({ text: "create shedule for next week" });
    console.log("Result:", result5.summary);

    const result6 = await orch.handle({ text: "scedule physics exam" });
    console.log("Result:", result6.summary);
  } catch (error) {
    console.error("❌ Typo handling test failed:", error);
  }

  // Test 3: Multi-tool execution
  console.log("\n📚 TEST 3: Multi-tool Execution");
  try {
    const result7 = await orch.handle({
      text: "make notes and flashcards for quantum physics",
    });
    console.log("Result:", result7.summary);
    console.log(
      "Artifacts:",
      result7.artifacts ? Object.keys(result7.artifacts) : "none"
    );
  } catch (error) {
    console.error("❌ Multi-tool test failed:", error);
  }
}

// Run tests when page loads
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    setTimeout(runComprehensiveTests, 1000);
  });
} else {
  runComprehensiveTests();
}

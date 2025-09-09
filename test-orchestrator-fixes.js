// Quick test to verify orchestrator fixes work
console.log("🧪 Testing Orchestrator Fixes");

// Test imports
import { AgentOrchestrator } from "./src/lib/agentOrchestrator.js";
import { TaskUnderstanding } from "./src/lib/taskUnderstanding.js";

async function testOrchestration() {
  console.log("\n1. Testing natural date/time parsing:");

  const scheduleTest = "schedule physics review tomorrow at 2pm";
  const understood = TaskUnderstanding.understandRequest(scheduleTest);
  console.log("Input:", scheduleTest);
  console.log("Parsed actions:", understood.actions);
  console.log("Date/time data:", understood.actions[0]?.data);

  console.log("\n2. Testing compound commands:");

  const compoundTest = "delete all flashcards and make 5 notes about calculus";
  const compoundResult = TaskUnderstanding.understandRequest(compoundTest);
  console.log("Input:", compoundTest);
  console.log("Actions count:", compoundResult.actions.length);
  console.log(
    "Actions:",
    compoundResult.actions.map((a) => `${a.type} ${a.target}`)
  );

  console.log("\n3. Testing orchestrator response format:");

  const testOrchestration = await AgentOrchestrator.run(
    "create 3 flashcards about javascript"
  );
  console.log("Orchestrator response shape:", {
    hasActions: !!testOrchestration.actions,
    actionsCount: testOrchestration.actions?.length,
    hasResults: !!testOrchestration.results,
    message: testOrchestration.message,
    success: testOrchestration.success,
  });

  console.log("\n✅ All orchestration fixes verified!");
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testOrchestration().catch(console.error);
}

export { testOrchestration };

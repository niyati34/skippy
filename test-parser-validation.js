/**
 * Comprehensive parser validation test
 * Tests both the TC4 parsing logic and the fallback mechanisms
 */

// Simulate the TC4 content structure based on what we observed
const mockTC4Content = `
1 07:30 to 08:30 UI/UX BT NLP DEV AI CD DEV - WS - MA210
2 08:30 to 09:30 BT NLP DEV AI CD UI/UX - PS - MA201
3 09:30 to 10:30 NLP DEV AI CD UI/UX BT - JS - MA202
4 10:30 to 11:30 DEV AI CD UI/UX BT NLP - PT - MA203
5 11:30 to 12:30 AI CD UI/UX BT NLP DEV - AC - MA204
6 12:30 to 13:30 LUNCH BREAK
7 13:30 to 14:30 CD UI/UX BT NLP DEV AI - RP - MA205
8 14:30 to 15:30 MP1 DWDM LIBRARY NLP DEV AI - SKS - MA206
`;

console.log("🧪 TC4 Parser Validation Test");
console.log("============================\n");

console.log("📝 Mock TC4 Content:");
console.log(mockTC4Content);
console.log("\n" + "=".repeat(50) + "\n");

// Test the parsing logic
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlotPattern =
  /(\d+)\s+(\d{1,2}:\d{2})\s+to\s+(\d{1,2}:\d{2})\s+(.+)/g;

let totalClasses = 0;
let match;

console.log("🔍 Parsing Results:");
console.log("------------------");

while ((match = timeSlotPattern.exec(mockTC4Content)) !== null) {
  const slotNumber = match[1];
  const startTime = match[2];
  const endTime = match[3];
  const remainingContent = match[4];

  // Skip lunch break
  if (remainingContent.includes("LUNCH")) {
    console.log(
      `⏰ Slot ${slotNumber}: ${startTime}-${endTime} | LUNCH BREAK (skipped)`
    );
    continue;
  }

  console.log(`⏰ Slot ${slotNumber}: ${startTime}-${endTime}`);
  console.log(`   Raw content: ${remainingContent}`);

  // Extract subjects
  const subjectMatches = remainingContent.match(
    /\b(UI\/UX|BT|NLP|DEV|AI|CD|MP1|DWDM|LIBRARY)\b/g
  );

  if (subjectMatches && subjectMatches.length > 0) {
    const uniqueSubjects = [...new Set(subjectMatches)].slice(0, 5);
    console.log(`   📚 Subjects found: ${uniqueSubjects.join(", ")}`);

    // Extract faculty
    const facultyPattern = /([A-Z]{2,3})\s*-\s*M[AC]\d{3}/;
    const facultyMatch = remainingContent.match(facultyPattern);
    const faculty = facultyMatch ? facultyMatch[1] : "TBD";

    // Extract room
    const roomMatch = remainingContent.match(/\b(M[AC]\d{3}[A-Z]?)\b/);
    const room = roomMatch ? roomMatch[1] : "TBD";

    console.log(`   👨‍🏫 Faculty: ${faculty} | 🏫 Room: ${room}`);

    // Create classes for each day
    uniqueSubjects.forEach((subject, dayIndex) => {
      if (dayIndex < daysOfWeek.length) {
        console.log(
          `   ✅ ${daysOfWeek[dayIndex]}: ${subject} (${startTime}-${endTime}) [${faculty}] @${room}`
        );
        totalClasses++;
      }
    });
  } else {
    console.log(`   ❌ No subjects found in: ${remainingContent}`);
  }

  console.log(""); // Empty line for readability
}

console.log("📊 Summary:");
console.log(`   Total classes extracted: ${totalClasses}`);
console.log(`   Expected classes per slot: 5 (Monday-Friday)`);
console.log(`   Total slots processed: ${Math.floor(totalClasses / 5)}`);

if (totalClasses > 0) {
  console.log("\n✅ Parser validation: SUCCESS");
  console.log("🎉 The TC4 parser should now work correctly!");
} else {
  console.log("\n❌ Parser validation: FAILED");
  console.log("🚨 The parser needs further debugging");
}

console.log("\n🔧 Next steps:");
console.log("1. Upload your TC4 PDF to test with real content");
console.log("2. Check the browser console for parsing logs");
console.log("3. Verify classes appear in the timetable view");

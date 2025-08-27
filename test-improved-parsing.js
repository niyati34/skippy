// Quick test to demonstrate the improved timetable parsing
// This simulates the type of messy data that was causing problems

const mockTimetableText = `
UNIVERSITY TIMETABLE - COMPUTER SCIENCE DEPARTMENT
Faculty Information and Contact Details

TIME    MONDAY          TUESDAY         WEDNESDAY
07:30   UI/UX PS MA213-A    BT SKS MB203      REST
09:00   DEV - WS - MA210    LIBRARY          DATABASE DESIGN
        BREAK TIME          BREAK            DR PATEL MC205
10:30   ALGORITHMS          NETWORKING       SOFTWARE ENG
        PROF KUMAR MA205    PROF SHAH MB101  PROF JONES MA301
12:00   LUNCH BREAK         LUNCH           LUNCH BREAK
14:00   PROJECT WORK        LAB SESSION      FREE PERIOD
        GROUP A             COMPUTER LAB A   
        
Footer Information: Contact registrar@university.edu
Total Credits: 18 | Semester: Fall 2025
`;

console.log("=== TESTING IMPROVED TIMETABLE PARSING ===");
console.log("\nSample messy input:");
console.log(mockTimetableText);

console.log("\n=== PREPROCESSING SIMULATION ===");

// Simulate the preprocessing that happens in the new function
const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const cleanedContent = mockTimetableText
  .split("\n")
  .filter((line) => {
    const upperLine = line.toUpperCase();
    const isDay = DAYS.some((day) => upperLine.includes(day));
    const hasTime = /\d{1,2}:\d{2}/.test(line);
    const isSubjectLine = /[A-Z]{2,}/.test(line);
    return (
      (isDay || hasTime || isSubjectLine) &&
      !upperLine.includes("FACULTY") &&
      !upperLine.includes("DEPARTMENT")
    );
  })
  .map((line) => line.replace(/\s+/g, " ").trim())
  .join("\n");

console.log("Cleaned content that will be sent to AI:");
console.log(cleanedContent);

console.log("\n=== EXPECTED AI OUTPUT FORMAT ===");
const expectedOutput = [
  {
    day: "Monday",
    start_time: "07:30",
    end_time: "09:00",
    subject: "UI/UX",
    faculty: "PS",
    room: "MA213-A",
  },
  {
    day: "Monday",
    start_time: "09:00",
    end_time: "10:30",
    subject: "DEV",
    faculty: "WS",
    room: "MA210",
  },
  {
    day: "Tuesday",
    start_time: "07:30",
    end_time: "09:00",
    subject: "BT",
    faculty: "SKS",
    room: "MB203",
  },
  {
    day: "Tuesday",
    start_time: "09:00",
    end_time: "10:30",
    subject: "LIBRARY",
    faculty: "N/A",
    room: "N/A",
  },
];

console.log(JSON.stringify(expectedOutput, null, 2));

console.log("\n=== IMPROVEMENTS MADE ===");
console.log("✅ Aggressive preprocessing removes irrelevant headers/footers");
console.log("✅ Few-shot prompting with concrete examples guides AI behavior");
console.log("✅ Robust JSON extraction handles various response formats");
console.log("✅ Manual fallback parsing for when AI fails");
console.log("✅ Consistent output format for UI consumption");
console.log("✅ Better error handling and logging throughout");

console.log("\n=== TO TEST MANUALLY ===");
console.log("1. Start the dev server: npm run dev:all");
console.log("2. Upload a TC4 PDF or messy timetable file");
console.log("3. Watch the console for detailed parsing logs");
console.log("4. Check Weekly Timetable tab for organized results");
console.log("5. Verify Schedule Manager shows converted calendar items");

// TC4 Content Analysis - Debug function to understand the structure
export function analyzeTC4Content() {
  const sampleContent = `FACULTY OF TECHNOLOGY Department of Computer Engineering Class Room:- MA205, MA206, MA210 With Effect From Date :- 30-06-2025 Semester:- VII Division: TC4 Class Coodinator: Prof. Parth Shah (MA213-C)(9898570708) TIME MONDAY TUESDAY WEDNESDAY THURSDAY FRIDAY Sr. No. ALL ALL ALL ALL A B NLP - AC - MA206 NLP - AC - MA206 1 07:30 to 08:30 UI/UX BT NLP DEV AI CD DEV - WS - MA210 DEV - WS -MA210 07:30 to 09:00 PS SKS AC WS PT JS MA213-A MB203 MC310 MB302 MC221 MC316 UI/UX - PS - MA201 AI - PT 2 08:30 to 09:30 BT - SKS - MA206 MA206 - - 09:00 to 10:30 MP1 UI/UX-PS - MA205 CD - JS CD - JS DWDM - RP 3 09:30 to 10:30 BT-SKS - MA206 MA211 MA206 MA206 TEA BREAK 10:30-11:00 CD - JS DWDM - RP 4 11:00 to 12:00 11:00 to 12:00 MP1 A B A B MA205 MA206 CD DWDM DWDM AI JS RP RP PT 5 12:00 to 12:30 MC316 MC315 MC222 MC223 LIBRARY MP1 MP1 12:00 to 1:00 AI - PT AI - PT DWDM - RP 6 12:30 to 1:30 MP1 MP1 MA210 MA210 MA210 1:00 to 1:30`;

  console.log("=== TC4 CONTENT ANALYSIS ===");

  // Find all time patterns
  const timePatterns = sampleContent.match(
    /\d{1,2}:\d{2}\s+to\s+\d{1,2}:\d{2}/g
  );
  console.log("Time patterns found:", timePatterns);

  // Find all subject codes
  const subjectPatterns = sampleContent.match(
    /\b(UI\/UX|BT|NLP|DEV|AI|CD|MP1|DWDM|LIBRARY)\b/g
  );
  console.log("Subject codes found:", subjectPatterns);

  // Find all faculty codes
  const facultyPatterns = sampleContent.match(/\b([A-Z]{2,3})\b/g);
  console.log("Faculty codes found:", facultyPatterns);

  // Find all room codes
  const roomPatterns = sampleContent.match(/\b(M[AC]\d{3}[A-Z]?)\b/g);
  console.log("Room codes found:", roomPatterns);

  // Analyze structure by lines
  const lines = sampleContent.split("\n");
  lines.forEach((line, index) => {
    if (line.includes("to")) {
      console.log(`Line ${index}: ${line}`);
    }
  });
}

// Make it available globally
(window as any).analyzeTC4Content = analyzeTC4Content;

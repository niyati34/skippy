import { useEffect, useState } from "react";
import { verifySession } from "@/lib/session";
import CyberGrid from "@/components/CyberGrid";
import SkippyAssistant from "@/components/SkippyAssistant";
import StudyDashboard from "@/components/StudyDashboard";

const Index = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [userName] = useState("Brother"); // You can make this dynamic

  const handlePasswordUnlock = (password: string) => {
    setIsUnlocked(true);
  };

  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await verifySession();
      if (!cancelled) {
        setIsUnlocked(ok);
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Cyber Grid Background */}
      <CyberGrid />

      {/* Main Content */}
      {checking ? null : !isUnlocked ? (
        <SkippyAssistant
          onPasswordUnlock={handlePasswordUnlock}
          isUnlocked={isUnlocked}
        />
      ) : (
        <StudyDashboard userName={userName} />
      )}
    </div>
  );
};

export default Index;

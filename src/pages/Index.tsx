import { useEffect, useState } from "react";
import CyberGrid from "@/components/CyberGrid";
import SkippyAssistant from "@/components/SkippyAssistant";
import StudyDashboard from "@/components/StudyDashboard";

const Index = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [userName] = useState("Brother"); // You can make this dynamic

  const handlePasswordUnlock = (password: string) => {
    setIsUnlocked(true);
  };

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        const tryVerify = async (url: string) => {
          const r = await fetch(url, { credentials: "include" });
          if (!r.ok) throw new Error(String(r.status));
          return (await r.json())?.ok === true;
        };
        // Try prod-relative first, then local dev proxy
        const ok = (await tryVerify("/api/unlock/verify").catch(() => false)) ||
          (await tryVerify("http://localhost:5174/api/unlock/verify").catch(() => false));
        if (!cancelled) setIsUnlocked(Boolean(ok));
      } catch {
        if (!cancelled) setIsUnlocked(false);
      }
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cyber Grid Background */}
      <CyberGrid />

      {/* Main Content */}
      {!isUnlocked ? (
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

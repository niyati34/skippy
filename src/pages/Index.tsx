import { useState } from 'react';
import CyberGrid from '@/components/CyberGrid';
import SkippyAssistant from '@/components/SkippyAssistant';
import StudyDashboard from '@/components/StudyDashboard';

const Index = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [userName] = useState("Brother"); // You can make this dynamic

  const handlePasswordUnlock = (password: string) => {
    setIsUnlocked(true);
  };

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

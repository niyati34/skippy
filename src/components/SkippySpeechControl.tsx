import React from "react";
import { Button } from "@/components/ui/button";
import { useAutoSpeech, SkippyMessages } from "@/lib/utils";
import { Volume2, VolumeX, Mic } from "lucide-react";

interface SkippySpeechControlProps {
  message?: string;
  autoStart?: boolean;
}

export const SkippySpeechControl: React.FC<SkippySpeechControlProps> = ({
  message = SkippyMessages.READY,
  autoStart = false,
}) => {
  const { speakNow, stopSpeaking, isSupported } = useAutoSpeech({
    text: message,
    autoStart,
    delay: 1000,
    rate: 0.9,
    volume: 0.7,
    voice: "female",
  });

  if (!isSupported) {
    return (
      <div className="text-muted-foreground text-sm">
        Speech not supported in this browser
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant="outline"
        size="sm"
        onClick={() => speakNow()}
        className="flex items-center gap-2 hover:bg-primary/10"
      >
        <Volume2 className="h-4 w-4" />
        Speak
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={stopSpeaking}
        className="flex items-center gap-2 hover:bg-destructive/10"
      >
        <VolumeX className="h-4 w-4" />
        Stop
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => speakNow(SkippyMessages.ENCOURAGEMENT)}
        className="flex items-center gap-2 hover:bg-accent/10"
      >
        <Mic className="h-4 w-4" />
        Encourage
      </Button>
    </div>
  );
};

export default SkippySpeechControl;

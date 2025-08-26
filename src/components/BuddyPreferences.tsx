import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Settings, Trash2 } from "lucide-react";
import { BuddyMemoryStorage, type BuddyMemory } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

export default function BuddyPreferences() {
  const [open, setOpen] = useState(false);
  const [mem, setMem] = useState<BuddyMemory>({ topics: [], messageCount: 0 });
  const { toast } = useToast();

  useEffect(() => {
    setMem(BuddyMemoryStorage.load());
  }, [open]);

  const save = () => {
    BuddyMemoryStorage.save({ ...mem, lastSeen: new Date().toISOString() });
    toast({
      title: "Preferences saved",
      description: "I'll use your name and tone in replies.",
    });
    setOpen(false);
  };

  const clearTopics = () => {
    const next = { ...mem, topics: [] };
    setMem(next);
    BuddyMemoryStorage.save(next);
  };

  const clearActivity = () => {
    const next = BuddyMemoryStorage.clearActivity();
    setMem(next);
    toast({
      title: "Activity cleared",
      description: "Recent agent actions removed.",
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 right-4 z-50"
          title="Preferences"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle>Buddy Preferences</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Your name</label>
            <Input
              placeholder="How should Skippy address you?"
              value={mem.name || ""}
              onChange={(e) => setMem((m) => ({ ...m, name: e.target.value }))}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tone</label>
            <div className="mt-2">
              <Select
                value={mem.tone || "friendly"}
                onValueChange={(v: any) => setMem((m) => ({ ...m, tone: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Known topics</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearTopics}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Clear
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(mem.topics || []).length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  No topics yet. Chat with Skippy and they'll appear here.
                </span>
              ) : (
                mem.topics!.slice(0, 20).map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Recent activity</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearActivity}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Clear
              </Button>
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground max-h-40 overflow-y-auto">
              {!(mem.lastTasks && mem.lastTasks.length) ? (
                <span>No recent actions.</span>
              ) : (
                mem.lastTasks!.slice(0, 12).map((t, i) => (
                  <div key={i}>
                    {new Date(t.when).toLocaleString()} [{t.type}] {t.summary}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="pt-2">
            <Button className="w-full" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type ORModel = {
  id: string;
  name?: string;
};

export default function ModelSelector() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ORModel[]>([]);
  const [value, setValue] = useState<string>(
    localStorage.getItem("clientModel") ||
      import.meta.env.VITE_OPENROUTER_MODEL ||
      ""
  );
  const current = useMemo(() => value || "default", [value]);

  useEffect(() => {
    let ignore = false;
    const fetchModels = async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/openrouter/check");
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        const list: ORModel[] = (j?.data || [])
          .map((m: any) => ({ id: m.id, name: m.name || m.id }))
          .filter((m: ORModel) => typeof m.id === "string");
        if (!ignore) setModels(list);
      } catch (e) {
        // Fallback to a small curated list of known free or common models
        if (!ignore)
          setModels([
            { id: "deepseek/deepseek-r1-0528-qwen3-8b:free" },
            { id: "meta-llama/llama-3.1-8b-instruct:free" },
            { id: "mistralai/mistral-7b-instruct-v0.1" },
            { id: "google/gemini-flash-1.5-8b:free" },
          ]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchModels();
    return () => {
      ignore = true;
    };
  }, []);

  const onChange = (v: string) => {
    setValue(v);
    if (v && v !== "default") {
      localStorage.setItem("clientModel", v);
      toast({ title: "Model selected", description: v });
    } else {
      localStorage.removeItem("clientModel");
      toast({ title: "Model reset", description: "Using server default" });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={current} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="h-8 w-[18rem]">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="default">Use server default</SelectItem>
          {models.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name || m.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange("default")}
          title="Reset model override"
        >
          Reset
        </Button>
      )}
    </div>
  );
}

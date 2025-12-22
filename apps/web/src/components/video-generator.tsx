"use client";

import { Clock, Loader2, Settings2, Sparkles, Wand2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { type ElementSelection, RemixEditor } from "@/components/remix-editor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { buildElementPrompt, canGenerate } from "@/lib/remix-prompt";
import type {
  KlingGenerationOptions,
  TemplateAnalysis,
} from "@/lib/templates-api";

type VideoGeneratorProps = {
  analysis: TemplateAnalysis;
  sourceVideoUrl: string;
  onGenerate: (
    prompt: string,
    options: KlingGenerationOptions
  ) => Promise<void>;
  isGenerating?: boolean;
};

export function VideoGenerator({
  analysis,
  sourceVideoUrl,
  onGenerate,
  isGenerating = false,
}: VideoGeneratorProps) {
  // Element selections for context-aware remix
  const [elementSelections, setElementSelections] = useState<
    ElementSelection[]
  >([]);

  // Generation options - initialized from analysis
  const [duration, setDuration] = useState<number>(() => {
    const d = analysis.duration;
    if (d && d >= 1 && d <= 10) {
      return d;
    }
    return 5;
  });
  const [aspectRatio, setAspectRatio] = useState<
    "16:9" | "9:16" | "1:1" | "auto"
  >(() => {
    const ar = analysis.aspectRatio;
    if (["16:9", "9:16", "1:1"].includes(ar)) {
      return ar as "16:9" | "9:16" | "1:1";
    }
    return "auto";
  });
  const [keepAudio, setKeepAudio] = useState(false);

  // Generated prompt from element selections
  const { prompt: generatedPrompt, elementRefs } = useMemo(
    () => buildElementPrompt(analysis.elements || [], elementSelections),
    [analysis.elements, elementSelections]
  );

  // Check if can generate
  const canGenerateNow = useMemo(
    () => canGenerate(elementSelections),
    [elementSelections]
  );

  // Handle element selection changes
  const handleSelectionsChange = useCallback(
    (selections: ElementSelection[]) => {
      setElementSelections(selections);
    },
    []
  );

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!sourceVideoUrl) {
      toast.error("Нет исходного видео для генерации");
      return;
    }

    if (!canGenerateNow) {
      toast.error("Выберите элементы для замены");
      return;
    }

    // Build options
    const options: KlingGenerationOptions = {
      duration,
      aspectRatio,
      keepAudio,
    };

    // Add element references for custom images
    if (elementRefs.length > 0) {
      options.elements = elementRefs;
    }

    await onGenerate(generatedPrompt, options);
  }, [
    sourceVideoUrl,
    canGenerateNow,
    generatedPrompt,
    elementRefs,
    duration,
    aspectRatio,
    keepAudio,
    onGenerate,
  ]);

  return (
    <Card className="border-violet-500/20 bg-linear-to-br from-violet-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="h-4 w-4 text-violet-400" />
          Генерация видео
        </CardTitle>
        <CardDescription>
          Выберите элементы для замены в ремиксе
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Remix Editor - key resets state when analysis changes */}
        <RemixEditor
          analysis={analysis}
          disabled={isGenerating}
          key={analysis.id}
          onSelectionsChange={handleSelectionsChange}
        />

        {/* Prompt preview */}
        {canGenerateNow && (
          <div className="space-y-2">
            <Label className="font-medium text-sm">
              Сгенерированный промпт
            </Label>
            <div className="rounded-lg border bg-surface-1 p-3">
              <p className="font-mono text-sm text-violet-200">
                {generatedPrompt}
              </p>
            </div>
          </div>
        )}

        {/* Generation Options */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              className="w-20"
              disabled={isGenerating}
              max={10}
              min={1}
              onChange={(e) => {
                const val = Number.parseInt(e.target.value, 10);
                if (val >= 1 && val <= 10) {
                  setDuration(val);
                }
              }}
              type="number"
              value={duration}
            />
            <span className="text-muted-foreground text-sm">сек</span>
          </div>

          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <Select
              disabled={isGenerating}
              onValueChange={(v) => setAspectRatio(v as typeof aspectRatio)}
              value={aspectRatio}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Авто</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={keepAudio}
              disabled={isGenerating}
              onCheckedChange={setKeepAudio}
            />
            <span className="text-muted-foreground text-sm">
              Сохранить аудио
            </span>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          className="w-full bg-violet-600 hover:bg-violet-700"
          disabled={isGenerating || !sourceVideoUrl || !canGenerateNow}
          onClick={handleGenerate}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Генерация...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Сгенерировать ремикс
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

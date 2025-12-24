"use client";

import {
  ChevronDown,
  Clock,
  Film,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { COMPOSITE_STATUS_CONFIG } from "@/lib/status-config";
import type { CompositeGeneration, SceneGeneration } from "@/lib/templates-api";
import { GenerationActions, GenerationError } from "./generation-card";

type CompositeGenerationCardProps = {
  generation: CompositeGeneration;
  sceneGenerations?: SceneGeneration[];
  onRegenerateScene?: (params: {
    sceneId: string;
    prompt?: string;
    useGeneratedAsSource?: boolean;
    imageUrls?: string[];
  }) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
};

export function CompositeGenerationCard({
  generation,
  sceneGenerations,
  onRegenerateScene,
  onDelete,
  isDeleting,
}: CompositeGenerationCardProps) {
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [regenerateSceneId, setRegenerateSceneId] = useState<string | null>(
    null
  );
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [useGeneratedAsSource, setUseGeneratedAsSource] = useState(false);
  const [hasCompletedGeneration, setHasCompletedGeneration] = useState(false);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  const isActive =
    generation.status === "pending" ||
    generation.status === "waiting" ||
    generation.status === "generating" ||
    generation.status === "concatenating" ||
    generation.status === "uploading";
  const isCompleted = generation.status === "completed";
  const isFailed = generation.status === "failed";

  const duration =
    generation.completedAt && generation.createdAt
      ? Math.round(
          (new Date(generation.completedAt).getTime() -
            new Date(generation.createdAt).getTime()) /
            1000
        )
      : null;

  const handleOpenRegenerateDialog = (sceneId: string) => {
    const sceneGen = sceneGenerations?.find((sg) =>
      generation.sceneConfig?.some(
        (c) => c.sceneId === sceneId && c.generationId === sg.id
      )
    );
    const hasCompleted =
      sceneGen?.status === "completed" && !!sceneGen?.videoUrl;

    const images =
      sceneGen?.selectedElements
        ?.filter((e) => e.customMediaUrl)
        .map((e) => e.customMediaUrl as string) || [];

    setRegenerateSceneId(sceneId);
    setRegeneratePrompt(sceneGen?.prompt || "");
    setHasCompletedGeneration(hasCompleted);
    setUseGeneratedAsSource(false);
    setReferenceImages(images);
    setRegenerateDialogOpen(true);
  };

  const handleRegenerate = () => {
    if (regenerateSceneId && onRegenerateScene) {
      onRegenerateScene({
        sceneId: regenerateSceneId,
        prompt: regeneratePrompt || undefined,
        useGeneratedAsSource: useGeneratedAsSource || undefined,
        imageUrls: referenceImages.length > 0 ? referenceImages : undefined,
      });
      setRegenerateDialogOpen(false);
      setRegenerateSceneId(null);
      setRegeneratePrompt("");
      setReferenceImages([]);
    }
  };

  const status =
    COMPOSITE_STATUS_CONFIG[generation.status] ||
    COMPOSITE_STATUS_CONFIG.pending;

  const sceneConfigs = generation.sceneConfig || [];
  const getSceneGeneration = (generationId?: string) =>
    sceneGenerations?.find((sg) => sg.id === generationId);

  const handleDelete = () => {
    onDelete?.(generation.id);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-glass-border bg-card shadow-(--shadow-glass) backdrop-blur-xl">
      <div className="flex items-center justify-between border-glass-border border-b bg-surface-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <Badge variant="default">COMPOSITE</Badge>
          <Badge className="text-xs" variant="outline">
            {sceneConfigs.length} сцен
          </Badge>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs ${status.className}`}
          >
            {isActive ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {status.label}
              </span>
            ) : (
              status.label
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Clock className="h-3 w-3" />
          {new Date(generation.createdAt).toLocaleString("ru-RU")}
          {duration !== null && (
            <span className="text-emerald-300">({duration}с)</span>
          )}
          {onDelete && (
            <AlertDialog
              onOpenChange={setDeleteDialogOpen}
              open={deleteDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  className="ml-2 h-6 w-6"
                  disabled={isDeleting}
                  size="icon"
                  variant="ghost"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 text-destructive" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить генерацию?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Это действие удалит составную генерацию, все связанные
                    генерации сцен и видеофайлы.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="flex flex-col p-4">
        {generation.videoUrl && (
          <div className="mb-3 flex h-80 gap-3">
            <video
              className="h-full rounded-lg"
              controls
              muted
              src={generation.videoUrl}
            />
          </div>
        )}

        {/* Scene breakdown with previews */}
        {sceneConfigs.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 font-medium text-muted-foreground text-xs">
              Сцены:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sceneConfigs.map((config) => {
                const sceneGen = getSceneGeneration(config.generationId);
                const sceneStatus = config.useOriginal
                  ? "original"
                  : sceneGen?.status || "pending";
                const thumbnailUrl = sceneGen?.scene?.thumbnailUrl;
                const sceneVideoUrl = sceneGen?.videoUrl;
                const isSceneActive =
                  sceneStatus === "pending" ||
                  sceneStatus === "processing" ||
                  sceneStatus === "generating";

                return (
                  <ScenePreviewCard
                    config={config}
                    isSceneActive={isSceneActive}
                    key={config.sceneId}
                    onRegenerateClick={() =>
                      handleOpenRegenerateDialog(config.sceneId)
                    }
                    onRegenerateScene={onRegenerateScene}
                    sceneGeneration={sceneGen}
                    sceneStatus={sceneStatus}
                    sceneVideoUrl={sceneVideoUrl}
                    thumbnailUrl={thumbnailUrl}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Progress */}
        {isActive && (
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {generation.progressMessage || "Обработка..."}
              </span>
              <span className="font-medium">{generation.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-1">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${generation.progress}%` }}
              />
            </div>
            {generation.progressStage && (
              <p className="mt-1 text-muted-foreground text-xs">
                Этап: {generation.progressStage}
              </p>
            )}
          </div>
        )}

        <GenerationError error={generation.error} show={isFailed} />
        <GenerationActions show={isCompleted} videoUrl={generation.videoUrl} />

        {/* Details Collapsible */}
        <Collapsible onOpenChange={setDetailsOpen} open={detailsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              className="mt-2 w-full justify-between"
              size="sm"
              variant="ghost"
            >
              <span>Подробности</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-3 rounded-lg bg-surface-1 p-3 text-xs">
              {/* Main info */}
              <div className="space-y-2">
                <p className="font-medium text-muted-foreground">
                  Основная информация:
                </p>
                <DetailRow label="ID" mono value={generation.id} />
                <DetailRow
                  label="Analysis ID"
                  mono
                  value={generation.analysisId}
                />
                <DetailRow label="Статус" value={generation.status} />
                <DetailRow label="Прогресс" value={`${generation.progress}%`} />
                {generation.progressStage && (
                  <DetailRow label="Этап" value={generation.progressStage} />
                )}
                {generation.progressMessage && (
                  <DetailRow
                    label="Сообщение"
                    value={generation.progressMessage}
                  />
                )}
                <DetailRow
                  label="Создано"
                  value={new Date(generation.createdAt).toLocaleString("ru-RU")}
                />
                {generation.completedAt && (
                  <DetailRow
                    label="Завершено"
                    value={new Date(generation.completedAt).toLocaleString(
                      "ru-RU"
                    )}
                  />
                )}
                {duration !== null && (
                  <DetailRow label="Длительность" value={`${duration} сек`} />
                )}
                {generation.videoUrl && (
                  <DetailRow
                    label="Video URL"
                    mono
                    value={generation.videoUrl}
                  />
                )}
                {generation.s3Key && (
                  <DetailRow label="S3 Key" mono value={generation.s3Key} />
                )}
                {generation.error && (
                  <div className="space-y-1">
                    <p className="text-red-400">Ошибка:</p>
                    <p className="break-all text-red-300">{generation.error}</p>
                  </div>
                )}
              </div>

              {/* Scene configs */}
              {sceneConfigs.length > 0 && (
                <div className="space-y-2 border-glass-border border-t pt-2">
                  <p className="font-medium text-muted-foreground">
                    Конфигурация сцен ({sceneConfigs.length}):
                  </p>
                  {sceneConfigs.map((config, idx) => {
                    const sceneGen = getSceneGeneration(config.generationId);
                    return (
                      <SceneConfigDetails
                        config={config}
                        index={idx}
                        key={config.sceneId}
                        sceneGeneration={sceneGen}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Regenerate Dialog */}
      <Dialog
        onOpenChange={setRegenerateDialogOpen}
        open={regenerateDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Перегенерация сцены</DialogTitle>
            <DialogDescription>
              Выберите источник и введите промпт для генерации
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Source selection */}
            <div className="space-y-2">
              <p className="font-medium text-sm">Источник:</p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => setUseGeneratedAsSource(false)}
                  size="sm"
                  variant={useGeneratedAsSource ? "outline" : "default"}
                >
                  <Film className="mr-2 h-4 w-4" />
                  Оригинал
                </Button>
                <Button
                  className="flex-1"
                  disabled={!hasCompletedGeneration}
                  onClick={() => setUseGeneratedAsSource(true)}
                  size="sm"
                  title={
                    hasCompletedGeneration
                      ? "Использовать предыдущую генерацию"
                      : "Нет завершённой генерации"
                  }
                  variant={useGeneratedAsSource ? "default" : "outline"}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Генерация
                </Button>
              </div>
              {!hasCompletedGeneration && (
                <p className="text-muted-foreground text-xs">
                  Для использования генерации как источника нужна завершённая
                  генерация этой сцены
                </p>
              )}
            </div>

            {/* Reference Images */}
            {referenceImages.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Референсные изображения:</p>
                <div className="flex flex-wrap gap-2">
                  {referenceImages.map((url, idx) => (
                    <div
                      className="group relative h-16 w-16 overflow-hidden rounded-lg border"
                      key={url}
                    >
                      <img
                        alt={`Референс ${idx + 1}`}
                        className="h-full w-full object-cover"
                        src={url}
                      />
                      <button
                        className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80 opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                        onClick={() =>
                          setReferenceImages((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        title="Удалить"
                        type="button"
                      >
                        <XCircle className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs">
                  Изображения будут использованы как референсы для генерации
                </p>
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-2">
              <p className="font-medium text-sm">Промпт:</p>
              <Textarea
                className="min-h-[100px]"
                onChange={(e) => setRegeneratePrompt(e.target.value)}
                placeholder="Опишите что должно быть на видео..."
                value={regeneratePrompt}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setRegenerateDialogOpen(false)}
              variant="outline"
            >
              Отмена
            </Button>
            <Button onClick={handleRegenerate}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Перегенерировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className={`break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

type SceneConfigDetailsProps = {
  config: {
    sceneId: string;
    sceneIndex: number;
    startTime: number;
    endTime: number;
    useOriginal?: boolean;
    generationId?: string;
  };
  index: number;
  sceneGeneration?: SceneGeneration;
};

function SceneConfigDetails({
  config,
  index,
  sceneGeneration,
}: SceneConfigDetailsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center justify-between rounded-lg bg-surface-2 p-2 text-left hover:bg-surface-2/80"
          type="button"
        >
          <span className="font-medium">
            Сцена #{index + 1}{" "}
            <span className="font-normal text-muted-foreground">
              ({config.startTime.toFixed(1)}s - {config.endTime.toFixed(1)}s)
            </span>
          </span>
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-1 rounded-lg bg-surface-2/50 p-2">
          <DetailRow label="Scene ID" mono value={config.sceneId} />
          <DetailRow label="Индекс" value={String(config.sceneIndex)} />
          <DetailRow
            label="Время"
            value={`${config.startTime.toFixed(2)}s - ${config.endTime.toFixed(2)}s`}
          />
          <DetailRow
            label="Использует оригинал"
            value={config.useOriginal ? "Да" : "Нет"}
          />
          {config.generationId && (
            <DetailRow label="Generation ID" mono value={config.generationId} />
          )}

          {/* Scene generation details */}
          {sceneGeneration && (
            <div className="mt-2 space-y-1 border-glass-border border-t pt-2">
              <p className="font-medium text-muted-foreground">
                Генерация сцены:
              </p>
              <DetailRow label="ID" mono value={sceneGeneration.id} />
              <DetailRow label="Статус" value={sceneGeneration.status} />
              <DetailRow label="Провайдер" value={sceneGeneration.provider} />
              <DetailRow
                label="Прогресс"
                value={`${sceneGeneration.progress}%`}
              />
              {sceneGeneration.progressStage && (
                <DetailRow label="Этап" value={sceneGeneration.progressStage} />
              )}
              {sceneGeneration.progressMessage && (
                <DetailRow
                  label="Сообщение"
                  value={sceneGeneration.progressMessage}
                />
              )}
              {sceneGeneration.prompt && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">Промпт:</p>
                  <p className="break-all rounded bg-surface-1 p-1">
                    {sceneGeneration.prompt}
                  </p>
                </div>
              )}
              <DetailRow
                label="Создано"
                value={new Date(sceneGeneration.createdAt).toLocaleString(
                  "ru-RU"
                )}
              />
              {sceneGeneration.completedAt && (
                <DetailRow
                  label="Завершено"
                  value={new Date(sceneGeneration.completedAt).toLocaleString(
                    "ru-RU"
                  )}
                />
              )}
              {sceneGeneration.videoUrl && (
                <DetailRow
                  label="Video URL"
                  mono
                  value={sceneGeneration.videoUrl}
                />
              )}
              {sceneGeneration.s3Key && (
                <DetailRow label="S3 Key" mono value={sceneGeneration.s3Key} />
              )}
              {sceneGeneration.error && (
                <div className="space-y-1">
                  <p className="text-red-400">Ошибка:</p>
                  <p className="break-all text-red-300">
                    {sceneGeneration.error}
                  </p>
                </div>
              )}
              {sceneGeneration.selectedElements &&
                sceneGeneration.selectedElements.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">
                      Выбранные элементы (
                      {sceneGeneration.selectedElements.length}):
                    </p>
                    {sceneGeneration.selectedElements.map((el, elIdx) => (
                      <div
                        className="flex items-center gap-2 rounded bg-surface-1 p-1"
                        key={elIdx}
                      >
                        {el.customMediaUrl && (
                          <a
                            className="block h-8 w-8 shrink-0 overflow-hidden rounded border border-glass-border"
                            href={el.customMediaUrl}
                            rel="noopener"
                            target="_blank"
                          >
                            <img
                              alt="Element media"
                              className="h-full w-full object-cover"
                              src={el.customMediaUrl}
                            />
                          </a>
                        )}
                        <span className="font-mono text-[10px]">
                          {el.elementId || "custom"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              {sceneGeneration.scene && (
                <div className="space-y-1 border-glass-border border-t pt-1">
                  <p className="text-muted-foreground">Информация о сцене:</p>
                  <DetailRow
                    label="Индекс"
                    value={String(sceneGeneration.scene.index)}
                  />
                  <DetailRow
                    label="Время"
                    value={`${sceneGeneration.scene.startTime.toFixed(2)}s - ${sceneGeneration.scene.endTime.toFixed(2)}s`}
                  />
                  <DetailRow
                    label="Длительность"
                    value={`${sceneGeneration.scene.duration.toFixed(2)}s`}
                  />
                  {sceneGeneration.scene.thumbnailUrl && (
                    <DetailRow
                      label="Thumbnail"
                      mono
                      value={sceneGeneration.scene.thumbnailUrl}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

type ScenePreviewCardProps = {
  config: {
    sceneId: string;
    sceneIndex: number;
    startTime: number;
    endTime: number;
    useOriginal?: boolean;
  };
  sceneStatus: string;
  thumbnailUrl?: string | null;
  sceneVideoUrl?: string | null;
  isSceneActive: boolean;
  onRegenerateScene?: CompositeGenerationCardProps["onRegenerateScene"];
  onRegenerateClick: () => void;
  sceneGeneration?: SceneGeneration;
};

function ScenePreviewCard({
  config,
  sceneStatus,
  thumbnailUrl,
  sceneVideoUrl,
  isSceneActive,
  onRegenerateScene,
  onRegenerateClick,
  sceneGeneration,
}: ScenePreviewCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-glass-border bg-surface-1">
      {/* Preview area */}
      <div className="relative aspect-video bg-surface-2">
        {sceneVideoUrl ? (
          <video
            className="h-full w-full object-cover"
            controls
            muted
            src={sceneVideoUrl}
          />
        ) : thumbnailUrl ? (
          <img
            alt={`Сцена ${config.sceneIndex + 1}`}
            className="h-full w-full object-cover"
            src={thumbnailUrl}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {isSceneActive ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : config.useOriginal ? (
              <Film className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Clock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}

        {/* Status overlay */}
        <div className="absolute top-1 left-1">
          <Badge
            className="text-xs"
            variant={
              sceneStatus === "completed"
                ? "default"
                : sceneStatus === "original"
                  ? "secondary"
                  : sceneStatus === "failed"
                    ? "destructive"
                    : "outline"
            }
          >
            {config.useOriginal
              ? "Ориг"
              : sceneStatus === "completed"
                ? "Готово"
                : sceneStatus === "processing" || sceneStatus === "generating"
                  ? "..."
                  : sceneStatus === "failed"
                    ? "Ошибка"
                    : "Ожид"}
          </Badge>
        </div>

        {/* Regenerate button overlay */}
        {onRegenerateScene && !config.useOriginal && (
          <Button
            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={onRegenerateClick}
            size="sm"
            title="Перегенерировать сцену"
            variant="secondary"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Scene info */}
      <div className="flex items-center justify-between px-2 py-1">
        <span className="font-medium text-xs">#{config.sceneIndex + 1}</span>
        <span className="text-muted-foreground text-xs">
          {config.startTime.toFixed(1)}s — {config.endTime.toFixed(1)}s
        </span>
      </div>

      {/* Scene details collapsible */}
      {sceneGeneration && (
        <Collapsible onOpenChange={setDetailsOpen} open={detailsOpen}>
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-center justify-center gap-1 border-glass-border border-t py-1 text-[10px] text-muted-foreground hover:bg-surface-2"
              type="button"
            >
              <span>Детали</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 border-glass-border border-t p-2 text-[10px]">
              <DetailRow label="ID" mono value={sceneGeneration.id} />
              <DetailRow label="Статус" value={sceneGeneration.status} />
              <DetailRow
                label="Прогресс"
                value={`${sceneGeneration.progress}%`}
              />
              {sceneGeneration.progressStage && (
                <DetailRow label="Этап" value={sceneGeneration.progressStage} />
              )}
              {sceneGeneration.prompt && (
                <div className="space-y-0.5">
                  <span className="text-muted-foreground">Промпт:</span>
                  <p className="line-clamp-2 break-all rounded bg-surface-2 p-1">
                    {sceneGeneration.prompt}
                  </p>
                </div>
              )}
              {sceneGeneration.error && (
                <p className="break-all text-red-300">
                  {sceneGeneration.error}
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

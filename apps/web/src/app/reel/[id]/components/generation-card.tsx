"use client";

import {
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react";
import NextImage from "next/image";
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
  GENERATION_STATUS_CONFIG,
  getGenerationVariant,
} from "@/lib/status-config";
import type { VideoGeneration } from "@/lib/templates-api";

type GenerationCardProps = {
  generation: VideoGeneration;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
};

export function GenerationCard({
  generation,
  onDelete,
  isDeleting,
}: GenerationCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isActive =
    generation.status === "pending" || generation.status === "processing";
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

  const status =
    GENERATION_STATUS_CONFIG[generation.status] ||
    GENERATION_STATUS_CONFIG.pending;

  const handleDelete = () => {
    onDelete?.(generation.id);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-glass-border bg-card shadow-(--shadow-glass) backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-glass-border border-b bg-surface-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <Badge variant={getGenerationVariant(generation.status)}>
            {generation.provider.toUpperCase()}
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
          {duration !== null ? (
            <span className="text-emerald-300">({duration}с)</span>
          ) : null}
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
                    Это действие удалит генерацию и связанный видеофайл из
                    хранилища.
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

      {/* Content */}
      <div className="flex flex-col p-4">
        {/* Thumbnail + Video preview */}
        {generation.thumbnailUrl !== null || generation.videoUrl !== null ? (
          <div className="mb-3 flex h-80 gap-3">
            {generation.thumbnailUrl !== null ? (
              <NextImage
                alt="Превью"
                className="rounded-lg object-cover"
                height={80}
                src={generation.thumbnailUrl}
                unoptimized
                width={80}
              />
            ) : null}
            {generation.videoUrl !== null ? (
              <video
                className="h-full rounded-lg"
                controls
                muted
                src={generation.videoUrl ?? undefined}
              />
            ) : null}
          </div>
        ) : null}

        {/* Prompts */}
        {generation.prompt ? (
          <div className="mb-3 space-y-2">
            <div>
              <p className="mb-1 font-medium text-muted-foreground text-xs">
                Оригинальный промпт:
              </p>
              <p className="line-clamp-3 rounded-lg bg-muted/50 p-2 text-sm">
                {generation.prompt}
              </p>
            </div>
            {generation.enhancedPrompt && (
              <div>
                <p className="mb-1 font-medium text-emerald-400 text-xs">
                  Улучшенный промпт (ChatGPT → Kling):
                </p>
                <p className="line-clamp-4 rounded-lg bg-emerald-950/30 p-2 text-emerald-100 text-sm">
                  {generation.enhancedPrompt}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Error */}
        <GenerationError error={generation.error} show={isFailed} />

        {/* Actions */}
        <GenerationActions show={isCompleted} videoUrl={generation.videoUrl} />

        {/* Processing indicator */}
        {isActive ? (
          <div className="mb-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
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
              <p className="text-muted-foreground text-xs">
                Этап: {generation.progressStage}
              </p>
            )}
          </div>
        ) : null}

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
            <div className="mt-2 space-y-2 rounded-lg bg-surface-1 p-3 text-xs">
              <DetailRow label="ID" mono value={generation.id} />
              <DetailRow label="Провайдер" value={generation.provider} />
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
              {generation.klingProgress !== undefined && (
                <DetailRow
                  label="Kling прогресс"
                  value={`${generation.klingProgress}%`}
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
              {generation.lastActivityAt && (
                <DetailRow
                  label="Посл. активность"
                  value={new Date(generation.lastActivityAt).toLocaleString(
                    "ru-RU"
                  )}
                />
              )}
              {duration !== null && (
                <DetailRow label="Длительность" value={`${duration} сек`} />
              )}
              {generation.remixSource && (
                <DetailRow
                  label="Remix источник"
                  mono
                  value={generation.remixSource}
                />
              )}
              {generation.imageReferences.length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    Референсы ({generation.imageReferences.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {generation.imageReferences.map((url, idx) => (
                      <a
                        className="block h-12 w-12 overflow-hidden rounded border border-glass-border"
                        href={url}
                        key={url}
                        rel="noopener"
                        target="_blank"
                        title={`Референс ${idx + 1}`}
                      >
                        <img
                          alt={`Референс ${idx + 1}`}
                          className="h-full w-full object-cover"
                          src={url}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {generation.enhancedPrompt && (
                <div className="space-y-1">
                  <p className="text-emerald-400">Улучшенный промпт:</p>
                  <p className="break-all text-emerald-300 text-xs">
                    {generation.enhancedPrompt}
                  </p>
                </div>
              )}
              {generation.videoUrl && (
                <DetailRow label="Video URL" mono value={generation.videoUrl} />
              )}
              {generation.thumbnailUrl && (
                <DetailRow
                  label="Thumbnail URL"
                  mono
                  value={generation.thumbnailUrl}
                />
              )}
              {generation.error && (
                <div className="space-y-1">
                  <p className="text-red-400">Ошибка:</p>
                  <p className="break-all text-red-300">{generation.error}</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
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

function GenerationError({
  show,
  error,
}: {
  show: boolean;
  error: string | null;
}) {
  if (!show || error === null) {
    return null;
  }

  return (
    <div className="mb-3 rounded-lg border border-red-500/20 bg-surface-1 p-2 text-red-300 text-sm">
      <p className="mb-1 font-medium text-xs">Ошибка:</p>
      {error}
    </div>
  );
}

function GenerationActions({
  show,
  videoUrl,
}: {
  show: boolean;
  videoUrl: string | null;
}) {
  if (!show || videoUrl === null) {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button asChild className="flex-1" size="sm" variant="default">
        <a href={videoUrl} rel="noopener" target="_blank">
          <ExternalLink className="mr-1 h-3 w-3" />
          Открыть видео
        </a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a download href={videoUrl}>
          <Download className="mr-1 h-3 w-3" />
          Скачать
        </a>
      </Button>
    </div>
  );
}

// Re-export helper components for use in CompositeGenerationCard
export { GenerationError, GenerationActions };

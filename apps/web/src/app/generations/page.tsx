"use client";

import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Film,
  Filter,
  Loader2,
  Trash2,
  Video,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeleteGeneration, useGenerations } from "@/lib/hooks/use-templates";
import {
  GENERATION_STATUS_CONFIG,
  getGenerationVariant,
} from "@/lib/status-config";
import type { GenerationListItem } from "@/lib/templates-api";

const STATUS_OPTIONS = [
  { value: "all", label: "Все статусы" },
  { value: "pending", label: "В очереди" },
  { value: "processing", label: "Генерация" },
  { value: "completed", label: "Завершено" },
  { value: "failed", label: "Ошибка" },
];

export default function GenerationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [limit] = useState(50);

  const { data, isLoading, refetch } = useGenerations({
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const deleteMutation = useDeleteGeneration();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Генерация удалена");
      refetch();
    } catch {
      toast.error("Ошибка удаления");
    }
  };

  const generations = data?.generations || [];
  const total = data?.total || 0;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">Генерации</h1>
          <p className="text-muted-foreground">
            Все видео-генерации в одном месте
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Фильтр по статусу" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-muted-foreground text-sm">{total} генераций</div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : generations.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-glass-border border-dashed bg-surface-1">
          <Video className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Генераций нет</p>
            <p className="text-muted-foreground text-sm">
              Создайте генерацию из любого рила
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">На главную</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {generations.map((generation) => (
            <GenerationCard
              generation={generation}
              isDeleting={deleteMutation.isPending}
              key={generation.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GenerationCard({
  generation,
  onDelete,
  isDeleting,
}: {
  generation: GenerationListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [originalOpen, setOriginalOpen] = useState(false);

  const isActive =
    generation.status === "pending" || generation.status === "processing";
  const isCompleted = generation.status === "completed";
  const isFailed = generation.status === "failed";

  const status =
    GENERATION_STATUS_CONFIG[generation.status] ||
    GENERATION_STATUS_CONFIG.pending;

  const StatusIcon = isCompleted
    ? CheckCircle2
    : isFailed
      ? XCircle
      : isActive
        ? Loader2
        : Clock;

  const handleDelete = () => {
    onDelete(generation.id);
    setDeleteDialogOpen(false);
  };

  const hasOriginal = !!generation.source.sourceUrl;

  return (
    <div className="group overflow-hidden rounded-xl border border-glass-border bg-card shadow-(--shadow-glass) backdrop-blur-xl transition-all hover:border-glass-border/80">
      {/* Video Preview */}
      <div className="relative aspect-video bg-surface-2">
        {generation.videoUrl ? (
          <video
            className="h-full w-full object-cover"
            controls
            muted
            playsInline
            poster={generation.thumbnailUrl || undefined}
            preload="metadata"
            src={generation.videoUrl}
          />
        ) : generation.thumbnailUrl ? (
          <img
            alt="Превью"
            className="h-full w-full object-cover"
            src={generation.thumbnailUrl}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <StatusIcon
              className={`h-8 w-8 ${isActive ? "animate-spin" : ""} text-muted-foreground`}
            />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${status.className}`}
          >
            {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
            {status.label}
          </span>
        </div>

        {/* Progress */}
        {isActive && (
          <div className="absolute right-2 bottom-2 left-2">
            <div className="h-1 overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${generation.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Source info */}
        <div className="flex items-center gap-2">
          <Badge variant={getGenerationVariant(generation.status)}>
            {generation.source.type === "template"
              ? "Шаблон"
              : generation.source.type === "upload"
                ? "Загрузка"
                : "URL"}
          </Badge>
          {generation.source.templateTitle && (
            <span className="truncate text-muted-foreground text-xs">
              {generation.source.templateTitle}
            </span>
          )}
        </div>

        {/* Prompt preview */}
        {generation.prompt && (
          <p className="line-clamp-2 text-sm">{generation.prompt}</p>
        )}

        {/* Date */}
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <Clock className="h-3 w-3" />
          {new Date(generation.createdAt).toLocaleString("ru-RU")}
        </div>

        {/* Original Video Collapsible */}
        {hasOriginal && (
          <Collapsible onOpenChange={setOriginalOpen} open={originalOpen}>
            <CollapsibleTrigger asChild>
              <Button
                className="w-full justify-between"
                size="sm"
                variant="ghost"
              >
                <span className="flex items-center gap-1">
                  <Film className="h-3 w-3" />
                  Оригинал
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${originalOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 overflow-hidden rounded-lg border border-glass-border bg-surface-1">
                <video
                  className="aspect-video w-full"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  src={generation.source.sourceUrl}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isCompleted && generation.videoUrl && (
            <>
              <Button asChild className="flex-1" size="sm" variant="default">
                <a href={generation.videoUrl} rel="noopener" target="_blank">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Открыть
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a download href={generation.videoUrl}>
                  <Download className="h-3 w-3" />
                </a>
              </Button>
            </>
          )}

          <AlertDialog
            onOpenChange={setDeleteDialogOpen}
            open={deleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button disabled={isDeleting} size="sm" variant="ghost">
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
                  Это действие удалит генерацию и связанный видеофайл.
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
        </div>
      </div>
    </div>
  );
}

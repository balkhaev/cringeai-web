"use client";

import {
  Bookmark,
  Check,
  Copy,
  Heart,
  Loader2,
  Sparkles,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGenerateFromTemplate,
  useToggleBookmark,
} from "@/lib/hooks/use-templates";
import type { FeedTemplateItem, Template } from "@/lib/templates-api";
import { cn } from "@/lib/utils";

function formatLikes(likes: number | null | undefined): string {
  if (likes === null || likes === undefined) {
    return "0";
  }
  if (likes >= 1_000_000) {
    return `${(likes / 1_000_000).toFixed(1)}M`;
  }
  if (likes >= 1000) {
    return `${(likes / 1000).toFixed(1)}K`;
  }
  return likes.toString();
}

type TemplateCardProps = {
  template: Template | FeedTemplateItem;
  onSelect?: (template: Template | FeedTemplateItem) => void;
};

// Type guard to check if template is full Template
function isFullTemplate(t: Template | FeedTemplateItem): t is Template {
  return "analysis" in t && "klingPrompt" in (t as Template).analysis;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const [copied, setCopied] = useState(false);
  const { mutate: generate, isPending } = useGenerateFromTemplate();
  const { mutate: toggleBookmark, isPending: isBookmarkPending } =
    useToggleBookmark();

  const isBookmarked =
    "isBookmarked" in template ? template.isBookmarked : false;
  const thumbnailUrl =
    "thumbnailUrl" in template
      ? template.thumbnailUrl
      : template.reel.thumbnailUrl;

  const handleCopy = useCallback(async () => {
    if (!isFullTemplate(template)) {
      toast.error("Информация недоступна в этом режиме");
      return;
    }
    // Копируем теги как текст
    const tags = template.analysis.tags?.join(", ") || "";
    if (!tags) {
      toast.error("Теги не найдены");
      return;
    }
    await navigator.clipboard.writeText(tags);
    setCopied(true);
    toast.success("Теги скопированы");
    setTimeout(() => setCopied(false), 2000);
  }, [template]);

  const handleGenerate = useCallback(() => {
    generate(
      { templateId: template.id },
      {
        onSuccess: () => {
          toast.success("Генерация Kling AI запущена");
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  }, [template.id, generate]);

  const handleBookmark = useCallback(() => {
    toggleBookmark(
      { templateId: template.id, isBookmarked: !!isBookmarked },
      {
        onSuccess: (data) => {
          toast.success(
            data.bookmarked ? "Добавлено в закладки" : "Удалено из закладок"
          );
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  }, [template.id, isBookmarked, toggleBookmark]);

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      {/* Thumbnail / Preview */}
      <div className="relative aspect-[9/16] max-h-48 overflow-hidden bg-muted">
        {thumbnailUrl ? (
          <Image
            alt={template.title || "Template preview"}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            fill
            sizes="(max-width: 768px) 50vw, 200px"
            src={thumbnailUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Video className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Overlay with likes and bookmark */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 font-medium text-sm text-white">
              <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />
              {formatLikes(template.reel.likeCount)}
            </span>
            <button
              className={cn(
                "transition-colors",
                isBookmarked
                  ? "text-yellow-400 hover:text-yellow-300"
                  : "text-white/80 hover:text-white"
              )}
              disabled={isBookmarkPending}
              onClick={(e) => {
                e.stopPropagation();
                handleBookmark();
              }}
            >
              <Bookmark
                className={cn("h-4 w-4", isBookmarked && "fill-current")}
              />
            </button>
          </div>
        </div>

        {/* Generation count badge */}
        {template.generationCount > 0 ? (
          <div className="absolute top-2 right-2">
            <Badge className="bg-black/50 text-white" variant="secondary">
              <Sparkles className="mr-1 h-3 w-3" />
              {template.generationCount}
            </Badge>
          </div>
        ) : null}
      </div>

      <CardHeader className="p-3 pb-2">
        <CardTitle className="line-clamp-2 text-sm">
          {template.title || "Шаблон"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 p-3 pt-0">
        {/* Tags */}
        {template.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge className="text-xs" key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 ? (
              <Badge className="text-xs" variant="outline">
                +{template.tags.length - 3}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {/* Category */}
        {template.category ? (
          <Badge className="text-xs" variant="secondary">
            {template.category}
          </Badge>
        ) : null}

        {/* Actions */}
        <Button
          className="w-full"
          disabled={isPending}
          onClick={handleGenerate}
          size="sm"
        >
          {isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          Kling AI
        </Button>

        {isFullTemplate(template) && (
          <Button
            className="w-full"
            onClick={handleCopy}
            size="sm"
            variant="outline"
          >
            {copied ? (
              <>
                <Check className="mr-1 h-3 w-3" />
                Скопировано
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3 w-3" />
                Промпт
              </>
            )}
          </Button>
        )}

        {onSelect ? (
          <Button
            className="w-full"
            onClick={() => onSelect(template)}
            size="sm"
            variant="ghost"
          >
            Подробнее
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

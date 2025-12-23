"use client";

import { Film, Loader2, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAllReels } from "@/lib/hooks/use-dashboard";
import { getReelVideoUrl, type SavedReel } from "@/lib/reels-api";
import { cn } from "@/lib/utils";

type VideoLibraryProps = {
  onSelect: (reel: SavedReel) => void;
  disabled?: boolean;
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function VideoThumbnail({
  reel,
  isSelected,
  onClick,
}: {
  reel: SavedReel;
  isSelected: boolean;
  onClick: () => void;
}) {
  const videoUrl = getReelVideoUrl(reel);

  return (
    <button
      className={cn(
        "group relative aspect-[9/16] w-full overflow-hidden rounded-lg border-2 bg-muted transition-all hover:border-primary/50",
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-transparent"
      )}
      onClick={onClick}
      type="button"
    >
      {videoUrl ? (
        <video
          className="h-full w-full object-cover"
          muted
          preload="metadata"
          src={`${videoUrl}#t=0.5`}
        >
          <track kind="captions" />
        </video>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Film className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <Play className="h-8 w-8 text-white" />
      </div>
      <div className="absolute right-1 bottom-1 rounded bg-black/60 px-1.5 py-0.5 text-white text-xs">
        {formatDuration(reel.duration)}
      </div>
      {isSelected && (
        <div className="absolute top-1 left-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs">
          Выбрано
        </div>
      )}
    </button>
  );
}

export function VideoLibrary({ onSelect, disabled }: VideoLibraryProps) {
  const [open, setOpen] = useState(false);
  const [selectedReel, setSelectedReel] = useState<SavedReel | null>(null);

  const { data, isLoading } = useAllReels(100);

  const uploadedVideos =
    data?.reels.filter(
      (r) => r.source === "upload" && (r.s3Key || r.localPath)
    ) ?? [];

  const handleSelect = () => {
    if (selectedReel) {
      onSelect(selectedReel);
      setOpen(false);
      setSelectedReel(null);
      toast.success("Видео выбрано из библиотеки");
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className="w-full"
          disabled={disabled || uploadedVideos.length === 0}
          variant="ghost"
        >
          <Film className="mr-2 h-4 w-4" />
          Выбрать из библиотеки ({uploadedVideos.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Библиотека видео</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : uploadedVideos.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Нет загруженных видео
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-3 gap-3">
                {uploadedVideos.map((reel) => (
                  <VideoThumbnail
                    isSelected={selectedReel?.id === reel.id}
                    key={reel.id}
                    onClick={() => setSelectedReel(reel)}
                    reel={reel}
                  />
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setOpen(false)} variant="outline">
                Отмена
              </Button>
              <Button disabled={!selectedReel} onClick={handleSelect}>
                Выбрать
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

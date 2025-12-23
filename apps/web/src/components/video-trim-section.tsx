"use client";

import { Download, Scissors } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTrimVideoByUrl } from "@/lib/hooks/use-trim";
import { VideoTrimEditor } from "./video-trim-editor";

type VideoTrimButtonProps = {
  videoUrl: string;
};

export function VideoTrimButton({ videoUrl }: VideoTrimButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [trimmedVideo, setTrimmedVideo] = useState<Blob | null>(null);
  const { mutate: trimVideo, isPending } = useTrimVideoByUrl();

  const handleTrim = useCallback(
    (startTime: number, endTime: number) => {
      trimVideo(
        { videoUrl, startTime, endTime },
        {
          onSuccess: (blob) => {
            setTrimmedVideo(blob);
            toast.success("Видео обрезано!");
          },
          onError: (err) => {
            toast.error(err.message || "Не удалось обрезать видео");
          },
        }
      );
    },
    [videoUrl, trimVideo]
  );

  const handleDownload = useCallback(() => {
    if (!trimmedVideo) {
      return;
    }

    const url = URL.createObjectURL(trimmedVideo);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trimmed_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [trimmedVideo]);

  const handleReset = useCallback(() => {
    setTrimmedVideo(null);
  }, []);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          variant="outline"
        >
          <Scissors className="mr-2 h-4 w-4" />
          Обрезать видео
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Обрезка видео</DialogTitle>
        </DialogHeader>

        {trimmedVideo ? (
          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <video
                className="h-full w-full object-contain"
                controls
                src={URL.createObjectURL(trimmedVideo)}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Скачать
              </Button>
              <Button onClick={handleReset} variant="outline">
                Обрезать снова
              </Button>
            </div>
          </div>
        ) : (
          <VideoTrimEditor
            isLoading={isPending}
            onTrim={handleTrim}
            videoUrl={videoUrl}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

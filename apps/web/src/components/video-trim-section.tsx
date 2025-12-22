"use client";

import { Download, Scissors } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTrimVideoByUrl } from "@/lib/hooks/use-trim";
import { VideoTrimEditor } from "./video-trim-editor";

type VideoTrimSectionProps = {
  videoUrl: string;
};

export function VideoTrimSection({ videoUrl }: VideoTrimSectionProps) {
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
    if (!trimmedVideo) return;

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scissors className="h-4 w-4" />
          Обрезка видео
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog onOpenChange={setIsOpen} open={isOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline">
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
      </CardContent>
    </Card>
  );
}

import { useMutation } from "@tanstack/react-query";
import {
  type TrimVideoByUrlRequest,
  type TrimVideoRequest,
  trimVideo,
  trimVideoByUrl,
} from "../api";

export function useTrimVideo() {
  return useMutation<Blob, Error, TrimVideoRequest>({
    mutationFn: trimVideo,
  });
}

export function useTrimVideoByUrl() {
  return useMutation<Blob, Error, TrimVideoByUrlRequest>({
    mutationFn: trimVideoByUrl,
  });
}

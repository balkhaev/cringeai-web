"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AILog,
  type AILogsFilter,
  type AIMetrics,
  cleanupLogs,
  type DebugStats,
  getAILogs,
  getAIMetrics,
  getDebugLogs,
  getDebugStats,
  getReelLogs,
  type LogsFilter,
  type PipelineStage,
  type ReelLog,
} from "../debug-api";

/**
 * Get debug stats for dashboard
 */
export function useDebugStats(from?: string, to?: string) {
  return useQuery<DebugStats>({
    queryKey: ["debug", "stats", from, to],
    queryFn: () => getDebugStats(from, to),
    refetchInterval: 10_000, // 10 sec
  });
}

/**
 * Get logs with filtering
 */
export function useDebugLogs(filter: LogsFilter = {}) {
  return useQuery<{
    logs: ReelLog[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["debug", "logs", filter],
    queryFn: () => getDebugLogs(filter),
    refetchInterval: 5000, // 5 sec
  });
}

/**
 * Get AI logs with filtering
 */
export function useAILogs(filter: AILogsFilter = {}) {
  return useQuery<{
    logs: AILog[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["debug", "ai-logs", filter],
    queryFn: () => getAILogs(filter),
    refetchInterval: 5000, // 5 sec
  });
}

/**
 * Get AI metrics by provider
 */
export function useAIMetrics(from?: string, to?: string) {
  return useQuery<{ metrics: AIMetrics[] }>({
    queryKey: ["debug", "ai-metrics", from, to],
    queryFn: () => getAIMetrics(from, to),
    refetchInterval: 10_000, // 10 sec
  });
}

/**
 * Get logs for specific reel
 */
export function useReelLogs(
  reelId: string,
  stage?: PipelineStage,
  limit?: number
) {
  return useQuery<{
    logs: ReelLog[];
    stats: Array<{
      stage: string;
      count: number;
      totalDuration: number;
      errors: number;
    }>;
    recentErrors: ReelLog[];
  }>({
    queryKey: ["debug", "reel-logs", reelId, stage, limit],
    queryFn: () => getReelLogs(reelId, stage, limit),
    refetchInterval: 3000, // 3 sec
    enabled: !!reelId,
  });
}

/**
 * Cleanup old logs
 */
export function useCleanupLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (olderThanDays?: number) => cleanupLogs(olderThanDays),
    onSuccess: () => {
      // Invalidate debug queries
      queryClient.invalidateQueries({ queryKey: ["debug"] });
    },
  });
}

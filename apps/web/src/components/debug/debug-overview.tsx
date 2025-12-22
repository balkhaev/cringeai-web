"use client";

import {
  Activity,
  AlertCircle,
  Clock,
  Cpu,
  Database,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, getProviderColor } from "@/lib/debug-api";
import { useAIMetrics, useDebugStats } from "@/lib/hooks/use-debug";

export function DebugOverview() {
  const { data: stats, isLoading, error } = useDebugStats();
  const { data: aiMetrics } = useAIMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" />
        Ошибка загрузки статистики
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Всего логов</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.logs.total}</div>
            <p className="text-muted-foreground text-xs">за последние 24ч</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Ошибки</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-destructive">
              {stats.logs.byLevel.error || 0}
            </div>
            <p className="text-muted-foreground text-xs">за последние 24ч</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">AI вызовы</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.ai.total}</div>
            <div className="mt-1 flex gap-2">
              <Badge className="text-green-500" variant="outline">
                {stats.ai.success} ok
              </Badge>
              {stats.ai.errors > 0 && (
                <Badge className="text-red-500" variant="outline">
                  {stats.ai.errors} err
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Очереди</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {stats.queues.totalActive + stats.queues.totalPending}
            </div>
            <div className="mt-1 flex gap-2">
              <Badge variant="outline">
                {stats.queues.totalActive} активных
              </Badge>
              <Badge variant="outline">
                {stats.queues.totalPending} ожидают
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs by Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Логи по этапам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {["scrape", "download", "analyze", "generate"].map((stage) => (
              <div
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                key={stage}
              >
                <span className="font-medium capitalize">{stage}</span>
                <Badge variant="secondary">
                  {stats.logs.byStage[stage] || 0}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Metrics by Provider */}
      {aiMetrics?.metrics && aiMetrics.metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI провайдеры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {aiMetrics.metrics.map((metric) => (
                <div
                  className="rounded-lg border bg-card p-4"
                  key={metric.provider}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`font-semibold capitalize ${getProviderColor(metric.provider)}`}
                    >
                      {metric.provider}
                    </span>
                    <Badge variant="outline">{metric.totalCalls} вызовов</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Успешных:</span>
                      <span className="text-green-500">
                        {metric.successCalls}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ошибок:</span>
                      <span className="text-red-500">{metric.errorCalls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Среднее время:
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(metric.avgDuration)}
                      </span>
                    </div>
                    {(metric.totalInputTokens > 0 ||
                      metric.totalOutputTokens > 0) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Токены:</span>
                        <span>
                          {metric.totalInputTokens} / {metric.totalOutputTokens}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Статус очередей</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.queues.byQueue).map(([name, queue]) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={name}
              >
                <span className="font-medium">{name}</span>
                <div className="flex gap-2">
                  <Badge
                    className="bg-blue-500/10 text-blue-500"
                    variant="outline"
                  >
                    {queue.active} активных
                  </Badge>
                  <Badge
                    className="bg-yellow-500/10 text-yellow-500"
                    variant="outline"
                  >
                    {queue.pending} ожидают
                  </Badge>
                  {queue.failed > 0 && (
                    <Badge
                      className="bg-red-500/10 text-red-500"
                      variant="outline"
                    >
                      {queue.failed} ошибок
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

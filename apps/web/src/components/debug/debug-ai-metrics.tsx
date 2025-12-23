"use client";

import { AlertCircle, Clock, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AIProvider,
  formatDuration,
  getProviderColor,
  getStatusColor,
} from "@/lib/debug-api";
import { useAILogs, useAIMetrics } from "@/lib/hooks/use-debug";

export function DebugAIMetrics() {
  const [provider, setProvider] = useState<AIProvider | "all">("all");
  const [status, setStatus] = useState<string>("all");

  const { data: metricsData, isLoading: metricsLoading } = useAIMetrics();
  const { data: logsData, isLoading: logsLoading } = useAILogs({
    provider: provider === "all" ? undefined : provider,
    status: status === "all" ? undefined : status,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      {metricsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {metricsData?.metrics.map((metric) => (
            <Card key={metric.provider}>
              <CardHeader className="pb-2">
                <CardTitle
                  className={`text-lg capitalize ${getProviderColor(metric.provider)}`}
                >
                  {metric.provider}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Zap className="h-3 w-3" /> Вызовы
                    </div>
                    <div className="font-bold text-2xl">
                      {metric.totalCalls}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Clock className="h-3 w-3" /> Среднее время
                    </div>
                    <div className="font-bold text-2xl">
                      {formatDuration(metric.avgDuration)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-sm">
                      Успешных
                    </div>
                    <div className="font-semibold text-green-500 text-xl">
                      {metric.successCalls}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <AlertCircle className="h-3 w-3" /> Ошибок
                    </div>
                    <div className="font-semibold text-red-500 text-xl">
                      {metric.errorCalls}
                    </div>
                  </div>
                  {(metric.totalInputTokens > 0 ||
                    metric.totalOutputTokens > 0) && (
                    <div className="col-span-2 border-t pt-2">
                      <div className="mb-1 text-muted-foreground text-sm">
                        Токены (вход / выход)
                      </div>
                      <div className="font-mono text-sm">
                        {metric.totalInputTokens.toLocaleString()} /{" "}
                        {metric.totalOutputTokens.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {metricsData?.metrics.length === 0 && (
            <div className="col-span-3 py-8 text-center text-muted-foreground">
              Нет данных AI метрик
            </div>
          )}
        </div>
      )}

      {/* AI Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Логи</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex gap-3">
            <Select
              onValueChange={(v) => setProvider(v as AIProvider | "all")}
              value={provider}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Провайдер" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="kling">Kling</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="success">Успех</SelectItem>
                <SelectItem value="error">Ошибка</SelectItem>
                <SelectItem value="pending">В процессе</SelectItem>
              </SelectContent>
            </Select>
            {logsData && (
              <div className="ml-auto flex items-center text-muted-foreground text-sm">
                Найдено: {logsData.total}
              </div>
            )}
          </div>

          {/* Table */}
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Провайдер</TableHead>
                    <TableHead>Операция</TableHead>
                    <TableHead className="w-24">Статус</TableHead>
                    <TableHead className="w-24">Время</TableHead>
                    <TableHead className="w-24">Токены</TableHead>
                    <TableHead className="w-36">Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData?.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge
                          className={getProviderColor(log.provider)}
                          variant="outline"
                        >
                          {log.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.operation}</div>
                        {log.model && (
                          <div className="text-muted-foreground text-xs">
                            {log.model}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusColor(log.status)}
                          variant="outline"
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDuration(log.duration)}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground text-xs">
                        {log.inputTokens || log.outputTokens
                          ? `${log.inputTokens || 0}/${log.outputTokens || 0}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(log.createdAt).toLocaleString("ru")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logsData?.logs.length === 0 && (
                    <TableRow>
                      <TableCell
                        className="py-8 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        AI логи не найдены
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

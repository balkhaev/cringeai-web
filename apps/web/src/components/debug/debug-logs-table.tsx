"use client";

import { ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
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
  formatDuration,
  getLogLevelColor,
  type LogLevel,
} from "@/lib/debug-api";
import { useDebugLogs } from "@/lib/hooks/use-debug";

export function DebugLogsTable() {
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [stage, setStage] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hideDebug, setHideDebug] = useState(true);

  const { data, isLoading } = useDebugLogs({
    level: level === "all" ? undefined : level,
    stage: stage === "all" ? undefined : stage,
    search: search || undefined,
    limit: 100,
  });

  const filteredLogs =
    hideDebug && level === "all"
      ? (data?.logs.filter((log) => log.level !== "debug") ?? [])
      : (data?.logs ?? []);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Логи Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              className="w-48"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              value={search}
            />
          </div>
          <Select
            onValueChange={(v) => setLevel(v as LogLevel | "all")}
            value={level}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Уровень" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={setStage} value={stage}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Этап" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="scrape">Scrape</SelectItem>
              <SelectItem value="download">Download</SelectItem>
              <SelectItem value="analyze">Analyze</SelectItem>
              <SelectItem value="generate">Generate</SelectItem>
            </SelectContent>
          </Select>
          {level === "all" && (
            <Button
              onClick={() => setHideDebug(!hideDebug)}
              size="sm"
              variant="ghost"
            >
              {hideDebug ? "Показать debug" : "Скрыть debug"}
            </Button>
          )}
          {data && (
            <div className="ml-auto flex items-center text-muted-foreground text-sm">
              Показано: {filteredLogs.length} / {data.total}
            </div>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead className="w-24">Уровень</TableHead>
                  <TableHead className="w-24">Этап</TableHead>
                  <TableHead>Сообщение</TableHead>
                  <TableHead className="w-24">Время</TableHead>
                  <TableHead className="w-32">Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <Collapsible
                    asChild
                    key={log.id}
                    open={expandedRows.has(log.id)}
                  >
                    <>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              className="h-6 w-6 p-0"
                              onClick={() => toggleRow(log.id)}
                              size="sm"
                              variant="ghost"
                            >
                              {expandedRows.has(log.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getLogLevelColor(log.level)}
                            variant="outline"
                          >
                            {log.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.stage}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {log.message}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDuration(log.duration)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(log.createdAt).toLocaleString("ru")}
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell className="p-4" colSpan={6}>
                            <div className="space-y-2">
                              <div>
                                <span className="font-medium">Reel ID:</span>{" "}
                                <code className="rounded bg-muted px-1 text-xs">
                                  {log.reelId}
                                </code>
                              </div>
                              <div>
                                <span className="font-medium">Сообщение:</span>{" "}
                                {log.message}
                              </div>
                              {log.metadata &&
                                Object.keys(log.metadata).length > 0 && (
                                  <div>
                                    <span className="font-medium">
                                      Метаданные:
                                    </span>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {Object.entries(log.metadata).map(
                                        ([key, value]) => (
                                          <span
                                            className="rounded bg-muted px-2 py-1 text-xs"
                                            key={key}
                                          >
                                            <span className="text-muted-foreground">
                                              {key}:
                                            </span>{" "}
                                            <span className="font-medium">
                                              {typeof value === "object"
                                                ? JSON.stringify(value)
                                                : String(value)}
                                            </span>
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell
                      className="py-8 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      Логи не найдены
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

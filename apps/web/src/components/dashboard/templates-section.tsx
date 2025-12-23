"use client";

import {
  Bookmark,
  Flame,
  Loader2,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { TemplateCard } from "@/components/template-card";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type FeedType,
  useFeed,
  useSearchTemplates,
} from "@/lib/hooks/use-templates";

const TAB_CONFIG = [
  { value: "trends" as const, label: "Тренды", icon: Flame },
  { value: "community" as const, label: "Сообщество", icon: Users },
  { value: "bookmarks" as const, label: "Закладки", icon: Bookmark },
];

function TemplatesList({ type }: { type: FeedType }) {
  const { data, isLoading } = useFeed({ type, limit: 20 });
  const templates = data?.items || [];

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p>
          {type === "bookmarks"
            ? "Нет сохранённых шаблонов"
            : type === "trends"
              ? "Нет трендовых шаблонов"
              : "Нет шаблонов"}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 pb-4">
        {templates.map((template) => (
          <div className="w-[280px] flex-shrink-0" key={template.id}>
            <TemplateCard template={template} />
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function SearchResults({ query }: { query: string }) {
  const { data, isLoading } = useSearchTemplates(query);
  const templates = data?.items || [];

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Search className="h-8 w-8" />
        <p>Ничего не найдено по запросу "{query}"</p>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 pb-4">
        {templates.map((template) => (
          <div className="w-[280px] flex-shrink-0" key={template.id}>
            <TemplateCard template={template} />
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

export function TemplatesSection() {
  const [activeTab, setActiveTab] = useState<FeedType>("trends");
  const [searchQuery, setSearchQuery] = useState("");

  const isSearching = searchQuery.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 font-semibold text-lg">
          <Sparkles className="h-5 w-5" />
          Шаблоны
        </h2>
        <div className="relative w-64">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск шаблонов..."
            value={searchQuery}
          />
        </div>
      </div>

      {isSearching ? (
        <SearchResults query={searchQuery} />
      ) : (
        <Tabs
          onValueChange={(v) => setActiveTab(v as FeedType)}
          value={activeTab}
        >
          <TabsList>
            {TAB_CONFIG.map((tab) => (
              <TabsTrigger
                className="gap-1.5"
                key={tab.value}
                value={tab.value}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TAB_CONFIG.map((tab) => (
            <TabsContent className="mt-3" key={tab.value} value={tab.value}>
              <TemplatesList type={tab.value} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

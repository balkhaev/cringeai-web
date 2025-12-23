"use client";

import { ReelsPipeline } from "@/components/dashboard/reels-pipeline";
import { ScraperPanel } from "@/components/dashboard/scraper-panel";
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4 lg:p-6">
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[22rem_1fr]">
        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <ScraperPanel />
          </div>
        </div>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-0">
            <ReelsPipeline />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

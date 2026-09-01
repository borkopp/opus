"use client";

import { Flame } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComingSoonOverlay } from "@/components/ui/coming-soon-overlay";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { SettingsCard, SettingsToggleRow } from "../SettingsCard";

interface DynamicSurgePricingTabProps {
  orgId: Id<"orgs">;
  initialData: {
    surgePricingEnabled: boolean;
    surgeRules: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      multiplierPct: number;
    }>;
  };
}

export function DynamicSurgePricingTab({
  initialData,
}: DynamicSurgePricingTabProps) {
  return (
    <TabsContent value="surge" className="m-0">
      <ComingSoonOverlay
        icon={Flame}
        badgeLabel="Coming Soon"
        description="Dynamic surge pricing to automatically adjust rates during peak demand hours will be available in an upcoming update."
      >
        <SettingsCard
          title="Surge pricing"
          description="Turn your existing peak-demand pricing rules on or off."
          action={
            <Badge
              variant="outline"
              className="border-border/80 bg-muted/60 text-xs font-medium text-muted-foreground"
            >
              Coming soon
            </Badge>
          }
          footer={<Button disabled>Save pricing settings</Button>}
        >
          <SettingsToggleRow
            title="Enable surge pricing"
            description="Apply configured price adjustments when a peak-demand rule matches a booking."
            control={
              <Switch
                id="surge-enabled"
                aria-label="Enable surge pricing"
                disabled
                checked={initialData.surgePricingEnabled}
              />
            }
          />

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Configured rules</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Rules are applied only while surge pricing is enabled.
              </p>
            </div>
            <Badge variant="secondary">
              {initialData.surgeRules.length === 1
                ? "1 rule"
                : `${initialData.surgeRules.length} rules`}
            </Badge>
          </div>
        </SettingsCard>
      </ComingSoonOverlay>
    </TabsContent>
  );
}

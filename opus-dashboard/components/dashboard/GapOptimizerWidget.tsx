"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import Link from "next/link";
import { ArrowRight, CheckIcon, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetTitle } from "@/components/dashboard/WidgetTitle";

export function GapOptimizerWidget({ orgId }: { orgId: Id<"orgs"> }) {
  const { t } = useDashboardI18n();
  const summary = useQuery(api.ai.gapOptimizerHelpers.getTodaySummary, {
    orgId,
  });
  const scan = useAction(api.ai.gapOptimizer.scanDayForOrg);
  const [manualScanning, setManualScanning] = useState(false);

  const isLoading = summary === undefined || manualScanning;
  const isPacked = summary && summary.openCount === 0;

  const handleScan = async () => {
    if (manualScanning) return;
    setManualScanning(true);
    try {
      await scan({
        orgId,
        detectedBy: "manual_scan",
      });
      toast.success(
        t("Schedule scan complete", "Скенирањето на распоредот е завршено"),
      );
    } catch (error) {
      console.error(error);
      toast.error(
        t("Failed to scan schedule", "Не успеа скенирањето на распоредот"),
      );
    } finally {
      setManualScanning(false);
    }
  };

  return (
    <motion.div
      whileHover={{ translateY: -4 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="h-full"
    >
      <Card className="group relative flex flex-col h-full p-6 col-span-1 lg:col-span-1 overflow-hidden">
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <WidgetTitle>{t("Fill Gaps", "Пополни празнини")}</WidgetTitle>
            </div>
          </div>

          {summary?.enabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleScan}
              disabled={manualScanning}
              aria-label={t("Scan schedule", "Скенирај распоред")}
              className="size-8 border border-border bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <RefreshCw
                className={`h-4 w-4 ${manualScanning ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>

        {summary?.enabled ? (
          <>
            <div className="flex flex-col flex-1 justify-center relative z-10 min-h-[120px]">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center justify-center h-full w-full"
                  >
                    <Shimmer className="text-sm font-medium [--color-background:theme(colors.foreground_/_0.8)] [--color-muted-foreground:theme(colors.muted-foreground)]">
                      {t("Scanning schedule...", "Скенирање на распоред...")}
                    </Shimmer>
                  </motion.div>
                ) : isPacked ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        bounce: 0.6,
                        duration: 0.8,
                      }}
                      className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mb-3"
                    >
                      <CheckIcon className="w-7 h-7 text-success" />
                    </motion.div>
                    <span className="text-lg font-semibold font-display text-success">
                      {t("Zero Gaps!", "Нема празнини!")}
                    </span>
                    <span className="text-muted-foreground text-xs font-medium mt-1">
                      {t(
                        "AI has found no gaps to fill.",
                        "Вештачката интелигенција не пронајде празнини за пополнување.",
                      )}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
                    className="flex flex-col w-full h-full justify-center"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <motion.span
                          initial={{ y: 10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.1, duration: 0.4 }}
                          className="text-5xl font-display font-black text-foreground tracking-tight select-none"
                        >
                          {summary.openCount}
                        </motion.span>
                        {summary.openCount === 1
                          ? t("recoverable gap", "празнина за пополнување")
                          : t("recoverable gaps", "празнини за пополнување")}
                      </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="micro-label text-muted-foreground mt-2 flex items-center gap-1"
                      >
                        {t("Est. Value:", "Проценета вредност:")}{" "}
                        <span className="text-foreground font-display">
                          <Price
                            amount={summary.totalEstimatedRevenueMinorUnits}
                          />
                        </span>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative z-10 mt-auto w-full border-t border-border pt-4 opacity-0 translate-y-3 pointer-events-none transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto">
              <Button
                asChild
                variant="ghost"
                className="h-11 w-full justify-between px-4 text-xs font-bold text-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
              >
                <Link href="/gap-optimizer">
                  {t("View AI Manager", "Отвори AI менаџер")}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 justify-center items-center relative z-10 gap-4 text-center px-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t(
                  "Gap Optimizer is off",
                  "Оптимизаторот на празнини е исклучен",
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t(
                  "Enable AI to automatically fill cancellations and gaps in your schedule.",
                  "Овозможете вештачка интелигенција за автоматско пополнување на откажувања и празнини во вашиот распоред.",
                )}
              </p>
            </div>
            <Link
              href="/settings?tab=gaps"
              className="text-xs font-medium text-primary hover:underline underline-offset-4 transition-colors"
            >
              {t("Configure in Settings", "Поставки")}
            </Link>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

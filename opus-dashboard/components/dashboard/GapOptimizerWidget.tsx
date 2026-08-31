"use client"

import { useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Price } from "@/components/ui/price"
import Link from "next/link"
import { ArrowRight, CheckIcon, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { WidgetTitle } from "@/components/dashboard/WidgetTitle"

export function GapOptimizerWidget({ orgId }: { orgId: Id<"orgs"> }) {
  const summary = useQuery(api.ai.gapOptimizerHelpers.getTodaySummary, { orgId })
  const scan = useAction(api.ai.gapOptimizer.scanDayForOrg)
  const [manualScanning, setManualScanning] = useState(false)

  const isLoading = summary === undefined || manualScanning;
  const isPacked = summary && summary.openCount === 0;

  const handleScan = async () => {
    if (manualScanning) return
    setManualScanning(true)
    try {
      await scan({
        orgId,
        detectedBy: "manual_scan"
      })
      toast.success("Schedule scan complete")
    } catch (error) {
      console.error(error)
      toast.error("Failed to scan schedule")
    } finally {
      setManualScanning(false)
    }
  }

  return (
    <motion.div
      whileHover={{ translateY: -4 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="h-full"
    >
      <Card
        className="group relative flex flex-col h-full p-6 col-span-1 lg:col-span-1 overflow-hidden"
      >

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <WidgetTitle>Fill Gaps</WidgetTitle>
            </div>
          </div>

          {summary?.enabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleScan}
              disabled={manualScanning}
              className="size-8 border border-border bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${manualScanning ? "animate-spin" : ""}`} />
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
                    <Shimmer className="text-sm font-medium [--color-background:theme(colors.foreground_/_0.8)] [--color-muted-foreground:theme(colors.muted-foreground)]">Scanning schedule...</Shimmer>
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
                      transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
                      className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mb-3"
                    >
                      <CheckIcon className="w-7 h-7 text-success" />
                    </motion.div>
                    <span className="text-lg font-semibold font-display text-success">Zero Gaps!</span>
                    <span className="text-muted-foreground text-xs font-medium mt-1">Ai has found no gaps to fill.</span>
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
                        recoverable gaps
                      </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="micro-label text-muted-foreground mt-2 flex items-center gap-1"
                      >
                        Est. Value: <span className="text-foreground font-display"><Price amount={summary.totalEstimatedRevenueMinorUnits} /></span>
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col gap-3 mt-5"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <span className="micro-label text-muted-foreground">
                            Auto-Sent
                          </span>
                          <span className="font-display text-sm font-black text-foreground">
                            {summary.outreachSentCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <span className="micro-label text-muted-foreground">
                            Filled
                          </span>
                          <span className="text-sm font-black text-success font-display">
                            {summary.filledCount}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="group/link relative z-10 mt-auto w-full border-t border-border pt-5">
              <Button
                asChild
                variant="ghost"
                className="h-11 w-full justify-between px-4 text-xs font-bold text-foreground transition-all duration-300 hover:bg-muted hover:text-foreground group-hover:translate-y-[-2px]"
              >
                <Link href="/gap-optimizer">
                  View AI Manager
                  <span className="flex items-center gap-1">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">View</span>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 justify-center items-center relative z-10 gap-4 text-center px-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Gap Optimizer is off</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Enable AI to automatically fill cancellations and gaps in your schedule.
              </p>
            </div>
            <Link
              href="/settings?tab=gaps"
              className="text-xs font-medium text-primary hover:underline underline-offset-4 transition-colors"
            >
              Configure in Settings
            </Link>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

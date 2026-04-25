"use client"

import { useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Price } from "@/components/ui/price"
import Link from "next/link"
import { ArrowRight, CheckIcon, Sparkles, Settings, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function GapOptimizerWidget({ orgId }: { orgId: string }) {
  const summary = useQuery(api.ai.gapOptimizerHelpers.getTodaySummary, { orgId: orgId as any })
  const scan = useAction(api.ai.gapOptimizer.scanDayForOrg)
  const [manualScanning, setManualScanning] = useState(false)

  const isLoading = summary === undefined || manualScanning;
  const isPacked = summary && summary.openCount === 0;

  const handleScan = async () => {
    if (manualScanning) return
    setManualScanning(true)
    try {
      await scan({
        orgId: orgId as any,
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
      <Card className="ai-widget-overlay terracotta-glow group relative flex flex-col h-full bg-card/60 backdrop-blur-xl p-6 col-span-1 lg:col-span-1 overflow-hidden rounded-[28px] transition-all duration-500 shadow-sm hover:shadow-md">

        {/* Terracotta radial spotlight — design system pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: summary?.enabled
            ? 'radial-gradient(circle at 70% 80%, rgba(206,93,69,0.04), transparent 60%)'
            : 'none'
        }} />

        {/* Ambient Blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-accent/6 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-display text-foreground leading-none">Fill <span className="serif-accent-inline">Gaps</span></span>
                {/* {summary?.enabled ? (
                  <div className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                    <span className="micro-label text-accent">Live</span>
                  </div>
                ) : (
                  <div className="px-2 py-0.5 rounded-full bg-muted border border-border flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                    <span className="micro-label text-muted-foreground">Off</span>
                  </div>
                )} */}
              </div>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                {isPacked ? "Schedule is packed" : <>AI-detected <span className="serif-accent-inline text-xs">open</span> slots</>}
              </p>
            </div>
          </div>

          {summary?.enabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleScan}
              disabled={manualScanning}
              className="h-8 w-8 rounded-xl bg-accent/5 hover:bg-accent/10 text-accent border border-accent/10 transition-all duration-300 active:scale-95"
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
                      className="w-14 h-14 bg-gradient-to-tr from-emerald-400/20 to-emerald-500/20 rounded-full flex items-center justify-center mb-3"
                    >
                      <CheckIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    </motion.div>
                    <span className="text-lg font-semibold font-display text-emerald-600 dark:text-emerald-400">Zero <span className="serif-accent-inline text-lg !text-emerald-500">Gaps!</span></span>
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
                          className="text-5xl font-outfit font-black text-foreground tracking-tight select-none"
                        >
                          {summary.openCount}
                        </motion.span>
                        <span className="serif-accent-inline text-base">recoverable gaps</span>
                      </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="micro-label text-muted-foreground mt-2 flex items-center gap-1"
                      >
                        Est. Value: <span className="text-foreground font-outfit"><Price amount={summary.totalEstimatedRevenueMinorUnits} /></span>
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-3 mt-5"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <span className="micro-label text-foreground/80">
                            Auto-Sent
                          </span>
                          <span className="text-sm font-black text-indigo-500 font-outfit">
                            {summary.outreachSentCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <span className="micro-label text-foreground/80">
                            <span className="serif-accent-inline text-[10px]">Filled</span>
                          </span>
                          <span className="text-sm font-black text-emerald-500 font-outfit">
                            {summary.filledCount}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-5 mt-auto border-t border-accent/10 relative z-10 w-full group/link">
              <Link href="/gap-optimizer" className="w-full">
                <button className="w-full flex items-center justify-between hover:bg-accent/5 rounded-2xl h-11 px-4 text-xs font-bold text-accent group-hover:translate-y-[-2px] transition-all duration-300">
                  View AI <span className="serif-accent-inline text-xs ml-1">Manager</span>
                  <div className="flex items-center gap-1">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">View</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 justify-center items-center relative z-10 gap-4 text-center px-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Gap Optimizer is <span className="serif-accent-inline text-sm">off</span></p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Enable AI to automatically fill cancellations and gaps in your schedule.
              </p>
            </div>
            <Link href="/settings?tab=gaps" className="w-full mt-2">
              <Button
                variant="outline"
                className="w-full rounded-2xl h-10 text-xs font-bold gap-2 border-accent/30 text-accent hover:bg-accent/5 hover:text-accent hover:border-accent/60"
              >
                <Settings className="h-3.5 w-3.5" />
                Configure in Settings
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

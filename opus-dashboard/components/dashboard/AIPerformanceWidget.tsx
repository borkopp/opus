"use client"

import { Card } from "@/components/ui/card";
import { Bot, ChevronDown, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

function StatCounter({ value, suffix = "", decimals = 0 }: { value: number, suffix?: string, decimals?: number }) {
   const [displayValue, setDisplayValue] = useState(0);

   useEffect(() => {
      let start = 0;
      const end = value;
      const duration = 1200;
      const startTime = performance.now();

      const update = (currentTime: number) => {
         const elapsed = currentTime - startTime;
         const progress = Math.min(elapsed / duration, 1);
         const ease = 1 - Math.pow(1 - progress, 4); // Ease-out-quart
         const current = start + (end - start) * ease;
         setDisplayValue(current);
         if (progress < 1) requestAnimationFrame(update);
      };

      requestAnimationFrame(update);
   }, [value]);

   return <>{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}

interface AIPerformanceProps {
   aiPerformance: {
      aiEnabled: boolean;
      totalConversations: number;
      bookingRate: number;
      handoffRate: number;
   };
}

export function AIPerformanceWidget({ aiPerformance }: AIPerformanceProps) {
   const enabled = aiPerformance?.aiEnabled ?? false;

   const containerVars = {
      hidden: { opacity: 0, y: 15 },
      visible: {
         opacity: 1,
         y: 0,
         transition: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1] as number[],
            staggerChildren: 0.1
         } as any
      }
   };

   const itemVars = {
      hidden: { opacity: 0, scale: 0.95, y: 10 },
      visible: {
         opacity: 1,
         scale: 1,
         y: 0,
         transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as number[] }
      }
   } as any;

   return (
      <motion.div
         variants={containerVars}
         initial="hidden"
         animate="visible"
         className="h-full"
      >
         <Card
            style={{ '--ai-overlay-rotation': '15deg' } as any}
            className="ai-widget-overlay terracotta-glow flex flex-col h-full bg-card/70 shadow-l backdrop-blur-xl p-6 col-span-1 lg:col-span-1 relative overflow-hidden rounded-[28px] transition-all duration-700 group border-border/40"
         >

            {/* Terracotta radial spotlight — design system pattern */}
            <div className="absolute inset-0 pointer-events-none" style={{
               background: enabled
                  ? 'radial-gradient(circle at 30% 20%, rgba(206,93,69,0.04), transparent 60%)'
                  : 'none'
            }} />

            {/* Ambient Blobs */}
            <motion.div
               animate={{
                  scale: enabled ? [1, 1.05, 1] : 1,
                  opacity: enabled ? [0.15, 0.25, 0.15] : 0.1
               }}
               transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
               className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] pointer-events-none ${enabled ? "bg-accent/8" : "bg-muted/10"}`}
            />
            <motion.div
               animate={{
                  scale: enabled ? [1, 1.08, 1] : 1,
                  opacity: enabled ? [0.1, 0.2, 0.1] : 0.05
               }}
               transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
               className={`absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] pointer-events-none ${enabled ? "bg-accent/8" : "bg-muted/5"}`}
            />

            <div className="flex justify-between items-start mb-6 relative z-10">
               <div className="flex items-center gap-4">
                  <motion.div whileHover={{ scale: 1.05 }} className="relative">
                     <div className={`absolute inset-0 rounded-2xl blur-lg transition-all duration-500 ${enabled ? "bg-accent/10" : "bg-muted/20"}`} />
                     <div className={`flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg relative z-10 transition-all duration-500 ${enabled ? "bg-gradient-to-br from-accent to-accent/80 text-white shadow-accent/20" : "bg-muted text-muted-foreground"}`}>
                        <Bot className={`h-6 w-6 ${enabled ? "text-white" : "text-muted-foreground"}`} />
                     </div>
                  </motion.div>
                  <div>
                     <div className="flex items-center gap-2">
                        <span className="text-lg font-bold font-display text-foreground leading-none">AI <span className="serif-accent-inline">Agent</span></span>
                        {enabled ? (
                           <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 flex items-center gap-1"
                           >
                              <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                              <span className="micro-label text-accent">Live</span>
                           </motion.div>
                        ) : (
                           <div className="px-2 py-0.5 rounded-full bg-muted border border-border flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                              <span className="micro-label text-muted-foreground">Off</span>
                           </div>
                        )}
                     </div>
                     <p className="text-xs text-muted-foreground mt-1 tracking-wide">Autonomous <span className="serif-accent-inline text-xs">Front-Desk</span></p>
                  </div>
               </div>
            </div>

            {enabled ? (
               <>
                  <div className="flex flex-col gap-6 flex-1 justify-center relative z-10">
                     <motion.div variants={itemVars} className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                           <motion.span
                              className="text-5xl font-outfit font-black text-foreground tracking-tight"
                           >
                              <StatCounter value={aiPerformance.totalConversations} />
                           </motion.span>
                           <span className="serif-accent-inline text-base">chats</span>
                        </div>
                        <span className="micro-label text-muted-foreground mt-2 flex items-center gap-1.5">
                           Monthly Conversations
                        </span>
                     </motion.div>

                     <div className="space-y-4">
                        <motion.div variants={itemVars} className="flex flex-col gap-2">
                           <div className="flex justify-between items-end">
                              <span className="micro-label text-foreground/80">
                                 Autonomous Success
                              </span>
                              <span className="text-sm font-black text-accent font-outfit">
                                 <StatCounter value={aiPerformance.bookingRate} suffix="%" decimals={1} />
                              </span>
                           </div>
                           <div className="h-3.5 w-full bg-muted/30 rounded-full border border-foreground/[0.03] p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] flex items-center overflow-hidden">
                              <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: `${aiPerformance.bookingRate}%` }}
                                 transition={{ duration: 1.5, ease: [0.25, 1, 0.5, 1], delay: 0.5 }}
                                 className="h-full bg-gradient-to-r from-accent via-accent to-[#e8472a] rounded-full relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                              >
                                 <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full" />
                              </motion.div>
                           </div>
                        </motion.div>

                        <motion.div variants={itemVars} className="flex flex-col gap-2">
                           <div className="flex justify-between items-end">
                              <span className="micro-label text-foreground/80">
                                 Human Assistance
                              </span>
                              <span className="text-sm font-black text-muted-foreground font-outfit">
                                 <StatCounter value={aiPerformance.handoffRate} suffix="%" decimals={1} />
                              </span>
                           </div>
                           <div className="h-3.5 w-full bg-muted/30 rounded-full border border-foreground/[0.03] p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] flex items-center overflow-hidden">
                              <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: `${aiPerformance.handoffRate}%` }}
                                 transition={{ duration: 1.5, ease: [0.25, 1, 0.5, 1], delay: 0.7 }}
                                 className="h-full bg-muted-foreground/30 rounded-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                              />
                           </div>
                        </motion.div>
                     </div>
                  </div>

                  <motion.div variants={itemVars} className="pt-5 border-t border-accent/10 relative z-10">
                     <Button
                        variant="ghost"
                        className="w-full justify-between hover:bg-accent/5 rounded-2xl h-11 text-xs font-bold text-accent group-hover:translate-y-[-2px] transition-all duration-300"
                     >
                        Analysis & Conversation Logs
                        <div className="flex items-center gap-1">
                           <motion.span
                              animate={{ x: [0, 2, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                           >
                              View
                           </motion.span>
                           <ChevronDown className="h-4 w-4" />
                        </div>
                     </Button>
                  </motion.div>
               </>
            ) : (
               <div className="flex flex-col flex-1 justify-center items-center relative z-10 gap-4 text-center px-2">
                  <motion.div
                     initial={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center"
                  >
                     <Bot className="h-7 w-7 text-muted-foreground/50" />
                  </motion.div>
                  <div>
                     <p className="text-sm font-semibold text-foreground">AI Agent is <span className="serif-accent-inline text-sm">off</span></p>
                     <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Enable the AI front-desk to handle bookings and customer messages automatically.
                     </p>
                  </div>
                  <Link href="/settings?tab=ai" className="w-full">
                     <Button
                        variant="outline"
                        className="w-full rounded-2xl h-10 text-xs font-bold gap-2 border-accent/30 text-accent hover:bg-accent/5 hover:text-accent hover:border-accent/60 transition-all active:scale-95"
                     >
                        <Settings className="h-3.5 w-3.5" />
                        Configure in Settings
                     </Button>
                  </Link>
               </div>
            )}
         </Card>
      </motion.div>
   );
}

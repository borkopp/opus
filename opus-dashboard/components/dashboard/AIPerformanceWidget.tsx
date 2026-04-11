import { Card } from "@/components/ui/card";
import { Bot, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function AIPerformanceWidget({ aiPerformance }: { aiPerformance: any }) {
   const enabled = aiPerformance?.aiEnabled ?? false;

   return (
      <Card className="flex flex-col h-full bg-card/60 backdrop-blur-xl p-6 col-span-1 lg:col-span-1 relative overflow-hidden rounded-[28px] transition-all duration-500 group">
         {/* Premium AI Gradient Background */}
         <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-accent/[0.08] pointer-events-none" />

         {/* Animated Blobs */}
         <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] pointer-events-none ${enabled ? "bg-primary/10 animate-pulse duration-[4000ms]" : "bg-muted/20"}`} />
         <div className={`absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] pointer-events-none ${enabled ? "bg-accent/15 animate-pulse duration-[6000ms]" : "bg-muted/10"}`} />

         {/* Subtle Grid Pattern */}
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-overlay" />

         <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-4">
               <div className="relative">
                  <div className={`absolute inset-0 rounded-2xl blur-lg transition-all duration-500 ${enabled ? "bg-primary/20 group-hover:bg-primary/30" : "bg-muted/30"}`} />
                  <div className={`flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${enabled ? "dark:bg-neutral-600 bg-gradient-to-br from-primary to-primary/80 text-white shadow-primary/20" : "bg-muted text-muted-foreground"}`}>
                     <Bot className={`h-6 w-6 ${enabled ? "text-white dark:text-black" : "text-muted-foreground"}`} />
                  </div>
               </div>
               <div>
                  <div className="flex items-center gap-2">
                     <span className="text-lg font-bold font-display text-foreground leading-none">AI Agent</span>
                     {enabled ? (
                        <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1">
                           <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                           <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Live</span>
                        </div>
                     ) : (
                        <div className="px-2 py-0.5 rounded-full bg-muted border border-border flex items-center gap-1">
                           <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Off</span>
                        </div>
                     )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Autonomous Front-Desk</p>
               </div>
            </div>
         </div>

         {enabled ? (
            <>
               <div className="flex flex-col gap-6 flex-1 justify-center relative z-10">
                  <div className="flex flex-col">
                     <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-outfit font-black text-foreground tracking-tight">
                           {aiPerformance.totalConversations}
                        </span>
                        <span className="text-primary font-bold text-sm">chats</span>
                     </div>
                     <span className="text-[11px] font-semibold text-muted-foreground font-outfit uppercase tracking-widest mt-1 opacity-70">
                        Total Conversations handled this month
                     </span>
                  </div>

                  <div className="space-y-2">
                     <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                           <span className="text-xs font-bold text-foreground/80 uppercase tracking-tight font-outfit">
                              Autonomous Success
                           </span>
                           <span className="text-sm font-black text-primary font-outfit">
                              {aiPerformance.bookingRate.toFixed(1)}%
                           </span>
                        </div>
                        <div className="h-3.5 w-full bg-muted/30 rounded-full border border-foreground/[0.03] p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] flex items-center">
                           <div
                              className="h-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-1000 ease-out rounded-full relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                              style={{ width: `${aiPerformance.bookingRate}%` }}
                           >
                              <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full" />
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                           <span className="text-xs font-bold text-foreground/80 uppercase tracking-tight font-outfit">
                              Human Assistance
                           </span>
                           <span className="text-sm font-black text-muted-foreground font-outfit">
                              {aiPerformance.handoffRate.toFixed(1)}%
                           </span>
                        </div>
                        <div className="h-3.5 w-full bg-muted/30 rounded-full border border-foreground/[0.03] p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] flex items-center">
                           <div
                              className="h-full bg-muted-foreground/30 transition-all duration-1000 ease-out rounded-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                              style={{ width: `${aiPerformance.handoffRate}%` }}
                           />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="pt-5 border-t border-primary/10 relative z-10">
                  <Button
                     variant="ghost"
                     className="w-full justify-between hover:bg-primary/5 rounded-2xl h-11 text-xs font-bold text-primary group-hover:translate-y-[-2px] transition-all duration-300"
                  >
                     Analysis & Conversation Logs
                     <div className="flex items-center gap-1">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">View</span>
                        <ChevronDown className="h-4 w-4" />
                     </div>
                  </Button>
               </div>
            </>
         ) : (
            <div className="flex flex-col flex-1 justify-center items-center relative z-10 gap-4 text-center px-2">
               <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Bot className="h-7 w-7 text-muted-foreground/50" />
               </div>
               <div>
                  <p className="text-sm font-semibold text-foreground">AI Agent is off</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                     Enable the AI front-desk to handle bookings and customer messages automatically.
                  </p>
               </div>
               <Link href="/settings?tab=ai" className="w-full">
                  <Button
                     variant="outline"
                     className="w-full rounded-2xl h-10 text-xs font-bold gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary/60"
                  >
                     <Settings className="h-3.5 w-3.5" />
                     Configure in Settings
                  </Button>
               </Link>
            </div>
         )}
      </Card>
   );
}

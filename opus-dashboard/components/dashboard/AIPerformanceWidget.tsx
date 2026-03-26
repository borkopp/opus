import { Card } from "@/components/ui/card";
import { Bot, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIPerformanceWidget({ aiPerformance }: { aiPerformance: any }) {
   return (
      <Card className="flex flex-col h-full bg-card/60 backdrop-blur-xl p-6 col-span-1 lg:col-span-1 relative overflow-hidden rounded-[28px] transition-all duration-500 group">
         {/* Premium AI Gradient Background */}
         <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-accent/[0.08] pointer-events-none" />

         {/* Animated Blobs */}
         <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none animate-pulse duration-[4000ms]" />
         <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-accent/15 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[6000ms]" />

         {/* Subtle Grid Pattern */}
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-overlay" />

         <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-4">
               <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg group-hover:bg-primary/30 transition-all duration-500" />
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl dark:bg-neutral-600 bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/20 relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                     <Bot className="h-6 w-6 text-white dark:text-black" />
                  </div>
               </div>
               <div>
                  <div className="flex items-center gap-2">
                     <span className="text-lg font-bold font-display text-foreground leading-none">AI Agent</span>
                     <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Live</span>
                     </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Autonomous Front-Desk</p>
               </div>
            </div>
            {/* <Sparkles className="h-4 w-4 text-primary animate-bounce duration-[3000ms]" /> */}
         </div>

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

         <div className=" pt-5 border-t border-primary/10 relative z-10">
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
      </Card>
   );
}

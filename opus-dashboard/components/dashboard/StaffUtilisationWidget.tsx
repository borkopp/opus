"use client"

import { Card } from "@/components/ui/card";
import { Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

function StatCounter({ value, suffix = "", decimals = 0 }: { value: number, suffix?: string, decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1500;
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

interface StaffUtilisationItem {
   staffName: string;
   bookedMins: number;
   availableMins: number;
   utilisationPct: number;
}

interface StaffUtilisationProps {
   staffUtilisation: StaffUtilisationItem[];
}

export function StaffUtilisationWidget({ staffUtilisation }: StaffUtilisationProps) {
   const totalBooked = staffUtilisation.reduce((sum, s) => sum + s.bookedMins, 0);
   const totalAvailable = staffUtilisation.reduce((sum, s) => sum + s.availableMins, 0);
   const overallUtilisation = totalAvailable > 0 ? (totalBooked / totalAvailable) * 100 : 0;

   const containerVars = {
      hidden: { opacity: 0, scale: 0.98 },
      visible: {
         opacity: 1,
         scale: 1,
         transition: {
            duration: 0.5,
            staggerChildren: 0.1
         }
      }
   };

   const itemVars = {
      hidden: { opacity: 0, x: -10 },
      visible: { opacity: 1, x: 0 }
   };

   const getUtilisationColor = (pct: number) => {
      if (pct >= 70) return "bg-green-500";
      if (pct >= 40) return "bg-amber-400";
      return "bg-destructive";
   };

   const getUtilisationText = (pct: number) => {
      if (pct >= 70) return "text-green-500";
      if (pct >= 40) return "text-amber-500";
      return "text-destructive";
   };

   return (
      <motion.div
         variants={containerVars}
         initial="hidden"
         animate="visible"
         className="h-full"
      >
         <Card className="flex flex-col bg-card p-5 col-span-1 lg:col-span-1 h-full rounded-[24px] border-border/40 shadow-sm transition-all duration-500 hover:shadow-md">
            <motion.div variants={itemVars} className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-semibold font-display text-primary">Staff Capacity</h2>
               <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse" />
            </motion.div>

            <motion.div variants={itemVars} className="flex items-center gap-6 mb-5 pb-5 border-b border-border/20">
               <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                     <defs>
                        <filter id="inset-shadow-capacity">
                           <feOffset dx="0" dy="1" />
                           <feGaussianBlur stdDeviation="1.5" result="offset-blur" />
                           <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                           <feFlood floodColor="black" floodOpacity="0.15" result="color" />
                           <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                           <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                        </filter>
                     </defs>
                     <path
                        className="text-secondary dark:text-zinc-800 stroke-current fill-none"
                        style={{ strokeWidth: 4 }}
                        strokeDasharray="100, 100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        filter="url(#inset-shadow-capacity)"
                     />
                     <motion.path
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ strokeDasharray: `${Math.min(100, isNaN(overallUtilisation) ? 0 : overallUtilisation)}, 100` }}
                        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        className={`stroke-current fill-none ${getUtilisationText(overallUtilisation)}`}
                        style={{ strokeWidth: 3 }}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        strokeLinecap="round"
                     />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                     <span className="text-sm font-bold font-outfit leading-none">
                        <StatCounter value={isNaN(overallUtilisation) ? 0 : overallUtilisation} />
                        <span className="ml-0.5">%</span>
                     </span>
                  </div>
               </div>
               <div className="flex flex-col">
                  <span className="text-3xl font-bold font-display leading-none">Overall</span>
                  <span className="text-sm text-muted-foreground font-medium mt-1">
                     Shop Utilisation Today
                  </span>
               </div>
            </motion.div>

            <div className="flex-1 flex flex-col gap-4 text-sm font-semibold">
               {staffUtilisation.length === 0 ? (
                  <span className="text-sm text-muted-foreground text-center py-4">No staff capacity data</span>
               ) : (
                  staffUtilisation.slice(0, 4).map((s: any, idx: number) => {
                     const pct = Math.min(100, isNaN(s.utilisationPct) ? 0 : s.utilisationPct);
                     return (
                        <motion.div 
                           key={s.staffName} 
                           variants={itemVars}
                           className="flex flex-col gap-2 group cursor-default"
                        >
                           <div className="flex justify-between items-center">
                              <span className="text-foreground/90 group-hover:text-primary transition-colors">{s.staffName}</span>
                              <span className="font-outfit text-primary/80">
                                 <StatCounter value={pct} suffix="%" />
                              </span>
                           </div>
                           <div className="w-full h-3 rounded-full bg-secondary/50 dark:bg-zinc-800/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)] flex items-center p-0.5 overflow-hidden">
                              <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: `${pct}%` }}
                                 transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.4 + (idx * 0.1) }}
                                 className={`h-full rounded-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${getUtilisationColor(pct)}`}
                              />
                           </div>
                        </motion.div>
                     );
                  })
               )}
            </div>
         </Card>
      </motion.div>
   );
}

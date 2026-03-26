import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

export function StaffUtilisationWidget({ staffUtilisation }: { staffUtilisation: any[] }) {
   const totalBooked = staffUtilisation.reduce((sum, s) => sum + s.bookedMins, 0);
   const totalAvailable = staffUtilisation.reduce((sum, s) => sum + s.availableMins, 0);
   const overallUtilisation = totalAvailable > 0 ? (totalBooked / totalAvailable) * 100 : 0;

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
      <Card className="flex flex-col bg-card p-5 col-span-1 lg:col-span-1 h-full rounded-[24px]">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold font-display text-primary">Staff Capacity</h2>
         </div>

         <div className="flex items-center gap-6 mb-5 pb-5 border-b border-border/40">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
               <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <defs>
                     <filter id="inset-shadow">
                        <feOffset dx="0" dy="1" />
                        <feGaussianBlur stdDeviation="1.5" result="offset-blur" />
                        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                        <feFlood floodColor="black" floodOpacity="0.25" result="color" />
                        <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                        <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                     </filter>
                  </defs>
                  {/* Background track (sunken trench) */}
                  <path
                     className="text-secondary stroke-current fill-none"
                     style={{ strokeWidth: 4 }}
                     strokeDasharray="100, 100"
                     d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                     filter="url(#inset-shadow)"
                  />
                  {/* Colored progress line (floating inside the trench) */}
                  <path
                     className={`stroke-current fill-none ${getUtilisationText(overallUtilisation)} transition-all`}
                     style={{ strokeWidth: 2.5 }}
                     strokeDasharray={`${Math.min(100, isNaN(overallUtilisation) ? 0 : overallUtilisation)}, 100`}
                     d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                     strokeLinecap="round"
                  />
               </svg>
               <span className="absolute text-sm font-bold font-outfit">{Math.round(isNaN(overallUtilisation) ? 0 : overallUtilisation)}%</span>
            </div>
            <div className="flex flex-col">
               <span className="text-3xl font-bold font-display leading-none">Overall</span>
               <span className="text-sm text-muted-foreground font-medium mt-1">Shop Utilisation Today</span>
            </div>
         </div>

         <div className="flex-1 flex flex-col gap-4">
            {staffUtilisation.length === 0 ? (
               <span className="text-sm text-muted-foreground text-center py-4">No staff capacity data</span>
            ) : (
               staffUtilisation.slice(0, 4).map((s: any) => {
                  const pct = Math.min(100, isNaN(s.utilisationPct) ? 0 : s.utilisationPct);
                  return (
                     <div key={s.staffName} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-sm font-semibold">
                           <span>{s.staffName}</span>
                           <span className="font-outfit">{Math.round(pct)}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-secondary shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] flex items-center p-0.5">
                           <div
                              className={`h-full rounded-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${getUtilisationColor(pct)} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                           />
                        </div>
                     </div>
                  );
               })
            )}
         </div>
      </Card>
   );
}

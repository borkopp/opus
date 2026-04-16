"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { IconScissors, IconClock, IconTag } from "@tabler/icons-react";

export function TeamServiceSkeleton({ className }: { className?: string }) {
   const services = [
      { id: 1, name: "Машко шишање", price: "600 ден.", duration: "30 мин.", icon: <IconScissors className="size-3" />, type: 'item' },
      { id: 3, name: "Нова услуга", price: "", duration: "", icon: null, type: 'placeholder' },
   ];

   return (
      <div className={cn("relative w-full aspect-[16/10] rounded-3xl bg-neutral-50/50 p-6 dark:bg-neutral-900/40 flex flex-col gap-4", className)}>
         {/* Services List */}
         <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pl-1">Услуги</span>
            <div className="space-y-2">
               {services.map((service, i) => (
                  <motion.div
                     key={service.id}
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.1 }}
                     className={cn(
                        "flex items-center justify-between p-2 px-3 rounded-xl transition-all",
                        service.type === 'placeholder'
                           ? "border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-transparent"
                           : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm"
                     )}
                  >
                     <div className="flex items-center gap-3">
                        <div className={cn(
                           "size-7 rounded-lg flex items-center justify-center",
                           service.type === 'placeholder' ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400" : "bg-brand-primary/10 text-brand-primary"
                        )}>
                           {service.type === 'placeholder' ? <span className="text-xs font-bold">+</span> : service.icon}
                        </div>
                        <span className={cn(
                           "text-xs font-bold",
                           service.type === 'placeholder' ? "text-neutral-400" : "text-neutral-700 dark:text-neutral-200"
                        )}>{service.name}</span>
                     </div>
                     {service.type === 'item' && (
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-1 text-[10px] font-medium text-neutral-400">
                              <IconClock className="size-3" />
                              {service.duration}
                           </div>
                           <span className="text-xs font-black text-brand-primary">{service.price}</span>
                        </div>
                     )}
                  </motion.div>
               ))}
            </div>
         </div>

         {/* Team Section */}
         <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Тим</span>
            <div className="flex gap-2">
               {[1, 2, 3, 4].map((staff, i) => (
                  <motion.div
                     key={staff}
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: 0.4 + (i * 0.1) }}
                     className="size-8 rounded-full border-2 border-white dark:border-neutral-800 shadow-sm bg-neutral-200 dark:bg-neutral-800 overflow-hidden"
                  >
                     <img src={`https://assets.aceternity.com/avatars/${staff}.webp`} className="size-full object-cover" alt="" />
                  </motion.div>
               ))}
               <div className="size-8 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-400">
                  <span className="text-[8px] font-bold">+</span>
               </div>
            </div>
         </div>

         {/* Floating Tag Simulation */}
         <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
            animate={{ opacity: 1, scale: 1, rotate: -5 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute right-6 bottom-4 p-3 rounded-2xl bg-brand-primary text-white shadow-xl z-10 flex flex-col gap-0.5"
         >
            <IconTag className="size-4 mb-1" />
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-80">20% Попуст</span>
            <span className="text-xs font-black">Среќен роденден!</span>
         </motion.div>
      </div>
   );
}

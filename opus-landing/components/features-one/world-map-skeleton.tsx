"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function FloorPlanSkeleton({ className }: { className?: string }) {
  const tables = [
    { id: 1, x: "20%", y: "25%", size: "48px", type: "square", status: "occupied" },
    { id: 2, x: "60%", y: "20%", size: "56px", type: "circle", status: "reserved" },
    { id: 3, x: "25%", y: "65%", size: "52px", type: "circle", status: "available" },
    { id: 4, x: "65%", y: "60%", size: "44px", type: "square", status: "available" },
  ];

  return (
    <div className={cn("relative w-full aspect-[16/10] rounded-xl bg-muted/40 p-6 overflow-hidden", className)}>
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]" 
             style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} 
        />
        
        {/* Tables */}
        {tables.map((table, i) => (
            <motion.div
                key={table.id}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: i * 0.15, 
                  duration: 0.6, 
                  ease: [0.23, 1, 0.32, 1] 
                }}
                className={cn(
                    "absolute flex items-center justify-center transition-all duration-500",
                    table.type === "circle" ? "rounded-full" : "rounded-xl",
                    
                    // Reserved State (Premium Highlight)
                    table.status === "reserved" && "bg-card border-2 border-primary shadow-sm z-10",
                    
                    // Occupied State (Quiet)
                    table.status === "occupied" && "bg-muted border border-border",
                    
                    // Available State (Clean)
                    table.status === "available" && "bg-card border border-border shadow-sm"
                )}
                style={{
                    left: table.x,
                    top: table.y,
                    width: table.size,
                    height: table.size,
                }}
            >
                {/* Minimalist Label */}
                <span className={cn(
                    "text-[10px] font-bold tracking-tighter",
                    table.status === "reserved" ? "text-primary" : "text-muted-foreground"
                )}>
                    {table.id}
                </span>

                {/* Status Indicator for Reserved */}
                {table.status === "reserved" && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute -top-1 -right-1 size-3 rounded-full bg-primary border-2 border-card shadow-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.15 + 0.3 }}
                  />
                )}
                

            </motion.div>
        ))}

        {/* Floating Tooltip Simulation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background shadow-lg z-20 flex flex-col gap-0.5"
        >
           <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Резервирано</span>
           <span className="text-[10px] font-bold">19:30 • 4 лица</span>
        </motion.div>
    </div>
  );
}

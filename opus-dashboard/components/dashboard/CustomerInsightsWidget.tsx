import { Card } from "@/components/ui/card";
import { UserPlus, AlertTriangle, TrendingUp, Calendar, Users, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

function NumberCounter({ value, prefix = "", suffix = "", decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1000;
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      const current = start + (end - start) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [value]);

  return <>{prefix}{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}

export function CustomerInsightsWidget({ insights, topCustomers, noShowRisk, formatMoney, revenueToday, bookingsToday }: any) {
  const containerVars = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Card className="flex flex-col bg-card p-5 h-full overflow-hidden relative">
      {/* <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" /> */}

      <motion.div
        variants={containerVars}
        initial="hidden"
        animate="visible"
        className="flex flex-col h-full relative z-10"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold font-display text-primary tracking-tight"><span className="serif-accent-inline">Insights</span> & Today</h2>
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
        </div>

        {/* Today's Quick Stats */}
        <motion.div variants={itemVars} className="grid grid-cols-2 gap-3 border-b border-border/20 pb-6 mb-6">
          <div className="flex flex-col gap-1.5 group cursor-default">
            <div className="flex items-center gap-1.5 micro-label text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-green-500 transition-transform group-hover:translate-y-[-2px]" /> Revenue
            </div>
            <span className="text-2xl font-bold font-outfit text-foreground leading-none">
              <NumberCounter value={revenueToday / 100} prefix="$" decimals={2} />
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-l border-border/20 pl-4 group cursor-default">
            <div className="flex items-center gap-1.5 micro-label text-muted-foreground">
              <Calendar className="w-3 h-3 text-primary transition-transform group-hover:rotate-12" /> Bookings
            </div>
            <span className="text-2xl font-bold font-outfit text-foreground leading-none">
              <NumberCounter value={bookingsToday} />
            </span>
          </div>
        </motion.div>

        <motion.div variants={itemVars} className="flex items-center gap-3 mb-6">
          <motion.div
            whileHover={{ scale: 1.02, translateY: -2 }}
            className="group relative flex flex-col gap-0.5 items-center justify-center p-3.5 bg-secondary/20 rounded-[18px] flex-1 border border-border/30 transition-colors hover:bg-secondary/40 hover:border-primary/20 cursor-default"
          >
            <span className="font-outfit text-3xl font-black text-primary leading-none">
              <NumberCounter value={insights.newThisMonth} />
            </span>
            <span className="micro-label text-muted-foreground group-hover:text-accent/70 transition-colors">New <span className="serif-accent-inline text-[10px]">Visitors</span></span>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02, translateY: -2 }}
            className="group relative flex flex-col gap-0.5 items-center justify-center p-3.5 bg-secondary/20 rounded-[18px] flex-1 border border-border/30 transition-colors hover:bg-secondary/40 hover:border-primary/20 cursor-default"
          >
            <span className="font-outfit text-3xl font-black text-primary leading-none">
              <NumberCounter value={insights.returningThisMonth} />
            </span>
            <span className="micro-label text-muted-foreground group-hover:text-accent/70 transition-colors">Returning</span>
          </motion.div>
        </motion.div>

        {(() => {
          const validCustomers = topCustomers.filter((c: any) => c.totalSpendMinorUnits > 0);
          if (validCustomers.length === 0) return null;
          return (
            <motion.div variants={itemVars} className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-muted-foreground font-outfit uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Top Performers
                </span>
                <ArrowUpRight className="w-3 h-3 text-muted-foreground/50" />
              </div>
              <div className="flex flex-col gap-2.5">
                {validCustomers.slice(0, 3).map((c: any, i: number) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + (i * 0.1) }}
                    whileHover={{ x: 4 }}
                    className="flex justify-between items-center text-[13px] font-outfit group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {i + 1}
                      </div>
                      <span className="font-semibold text-foreground truncate max-w-[100px] group-hover:text-primary transition-colors">{c.name}</span>
                    </div>
                    <span className="font-bold text-foreground">
                      {formatMoney(c.totalSpendMinorUnits)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })()}

        {(insights.atRiskChurn > 0 || (noShowRisk?.customers && noShowRisk.customers.length > 0)) && (
          <motion.div
            variants={itemVars}
            className="mt-auto pt-4 border-t border-border/20 space-y-1.5"
          >
            {insights.atRiskChurn > 0 && (
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center justify-between p-2 rounded-xl bg-destructive/5 text-[11px] text-destructive font-bold font-outfit border border-destructive/10"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  At Risk Customers
                </div>
                <span className="bg-destructive/10 px-2 py-0.5 rounded-md">{insights.atRiskChurn}</span>
              </motion.div>
            )}
            {noShowRisk?.customers?.length > 0 && (
              <motion.div
                animate={{ scale: [1, 1.01, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="flex items-center justify-between p-2 rounded-xl bg-accent/5 text-[11px] text-accent font-bold font-outfit border border-accent/10"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  No-Show Risk
                </div>
                <span className="bg-accent/10 px-2 py-0.5 rounded-md">{noShowRisk.customers.length}</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>
    </Card>
  );
}

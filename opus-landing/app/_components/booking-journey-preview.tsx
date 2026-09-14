"use client";

import { useState } from "react";
import { ToggleGroup } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Clock3,
  Link2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { landingCopy } from "@/lib/landing-copy";

export function SetupPreview() {
  const { locale } = useI18n();
  const copy = landingCopy[locale].journey;
  const services = [
    { name: copy.service, duration: 45, price: 800 },
    { name: copy.secondService, duration: 20, price: 400 },
    { name: copy.thirdService, duration: 60, price: 1500 },
  ];

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="text-xl font-medium tracking-tight">{copy.services}</h3>
        <Sparkles className="text-brand-primary size-5" aria-hidden="true" />
      </div>
      <ul className="flex flex-col">
        {services.map((service, index) => (
          <li
            key={service.name}
            className="border-border flex items-center gap-4 border-b py-4"
          >
            <span className="text-brand-primary bg-brand-primary/8 flex size-10 shrink-0 items-center justify-center rounded-xl text-sm">
              0{index + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-medium">{service.name}</span>
              <span className="text-muted-foreground text-xs">
                {service.duration} {copy.minutes}
              </span>
            </span>
            <span className="shrink-0 text-xs tabular-nums">
              {service.price} {copy.currency}
            </span>
          </li>
        ))}
      </ul>
      <div className="bg-muted/50 mt-6 flex items-start gap-3 rounded-xl p-4">
        <Clock3
          className="text-muted-foreground mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <div className="flex flex-1 flex-col gap-1 text-xs">
          <span className="font-medium">{copy.hours}</span>
          <span className="text-muted-foreground">{copy.weekdays}</span>
        </div>
        <span className="text-xs tabular-nums">09:00–17:00</span>
      </div>
      <p className="text-brand-primary mt-5 flex items-center gap-2 text-xs">
        <Check className="size-3.5" aria-hidden="true" />
        {copy.ready}
      </p>
    </>
  );
}

export function SharePreview({ onTryBooking }: { onTryBooking: () => void }) {
  const { locale } = useI18n();
  const copy = landingCopy[locale].journey;

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-brand-primary border-brand-primary/20 bg-brand-primary/5 mb-6 flex size-16 items-center justify-center rounded-2xl border">
        <Link2 className="size-7" aria-hidden="true" />
      </div>
      <h3 className="max-w-sm text-2xl font-medium tracking-tight">
        {copy.linkLabel}
      </h3>
      <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
        {copy.linkHint}
      </p>
      <div className="border-border bg-muted/40 mt-8 flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-5 text-sm sm:text-lg">
        <span className="min-w-0 truncate">
          <span className="font-medium">luna-studio</span>
          <span className="text-muted-foreground">.opus.mk</span>
        </span>
      </div>
      <Button
        variant="brand"
        size="hero"
        className="mt-6"
        onClick={onTryBooking}
      >
        {copy.tryBooking}
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Button>
    </div>
  );
}

export function BookingPreview() {
  const { locale } = useI18n();
  const copy = landingCopy[locale].journey;
  const [time, setTime] = useState("14:30");
  const [confirmed, setConfirmed] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const reducedMotion = useReducedMotion();
  const instant = Boolean(reducedMotion || keyboard);

  return (
    <div
      className="flex h-full flex-col"
      onKeyDownCapture={() => setKeyboard(true)}
      onPointerDownCapture={() => setKeyboard(false)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={confirmed ? "confirmed" : "choose"}
          initial={{
            opacity: 0,
            transform: instant ? "none" : "translateY(8px)",
          }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{
            opacity: 0,
            transform: instant ? "none" : "translateY(-6px)",
          }}
          transition={{ duration: instant ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col"
        >
          {confirmed ? (
            <>
              <div role="status">
                <span className="text-brand-primary bg-brand-primary/10 mb-5 flex size-12 items-center justify-center rounded-full">
                  <CalendarCheck2 className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-2xl font-medium tracking-tight">
                  {copy.confirmed}
                </h3>
                <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
                  {copy.confirmedDetail}
                </p>
              </div>
              <div className="border-border mt-6 rounded-xl border p-4">
                <p className="text-muted-foreground mb-5 text-[11px]">
                  {copy.calendar} · {copy.tomorrow}
                </p>
                <div className="flex gap-4">
                  <span className="text-muted-foreground pt-3 font-mono text-xs">
                    {time}
                  </span>
                  <div className="border-brand-primary bg-brand-primary/8 flex flex-1 flex-col gap-1 rounded-lg border-l-2 p-3">
                    <span className="text-sm font-medium">{copy.service}</span>
                    <span className="text-muted-foreground text-xs">
                      {copy.client} · 45 {copy.minutes}
                    </span>
                    <span className="text-brand-primary mt-2 flex items-center gap-1 text-[11px]">
                      <Check className="size-3" aria-hidden="true" />
                      {copy.booked}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-2 text-xs">
                {copy.tomorrow} · {copy.studio}
              </p>
              <h3 className="text-2xl font-medium tracking-tight">
                {copy.chooseTime}
              </h3>
              <div className="border-border my-6 flex items-center justify-between gap-4 border-y py-5">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{copy.service}</span>
                  <span className="text-muted-foreground text-xs">
                    45 {copy.minutes}
                  </span>
                </div>
                <span className="text-sm">800 {copy.currency}</span>
              </div>
              <ToggleGroup.Root
                type="single"
                value={time}
                onValueChange={(value) => {
                  if (value) setTime(value);
                }}
                aria-label={copy.chooseTime}
                className="grid grid-cols-3 gap-2"
              >
                {["14:30", "15:30", "16:30"].map((slot) => (
                  <ToggleGroup.Item
                    key={slot}
                    value={slot}
                    className="border-border hover:bg-muted focus-visible:outline-ring data-[state=on]:border-brand-primary data-[state=on]:bg-brand-primary/10 data-[state=on]:text-brand-primary cursor-pointer rounded-xl border px-2 py-4 text-sm tabular-nums transition-[background-color,border-color,color] focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {slot}
                  </ToggleGroup.Item>
                ))}
              </ToggleGroup.Root>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <Button
        variant={confirmed ? "outline" : "brand"}
        size="hero"
        className="mt-6 w-full"
        onClick={() => setConfirmed(!confirmed)}
      >
        {confirmed ? copy.restart : copy.confirm}
        {confirmed ? (
          <RotateCcw data-icon="inline-end" aria-hidden="true" />
        ) : (
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

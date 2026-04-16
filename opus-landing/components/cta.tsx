"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { IconArrowRight, IconSparkles, IconClock } from "@tabler/icons-react"
import { Button } from "./button"
import Image from "next/image"
import Link from "next/link"

const TARGET_DATE = new Date("2026-05-15T00:00:00")

function getTimeLeft() {
  const diff = TARGET_DATE.getTime() - Date.now()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

function AnimatedDigit({ value }: { value: number }) {
  return (
    <div className="relative h-[1.1em] w-[1.1em] overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center font-sans text-4xl md:text-5xl lg:text-5xl tracking-tight tabular-nums"
        >
          {String(value).padStart(2, "0")}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center bg-white dark:bg-neutral-900 backdrop-blur-sm border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3 md:px-6 md:py-5 min-w-[80px] md:min-w-[100px] shadow-sm overflow-hidden group">
        <div className="absolute inset-0 bg-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span className="text-4xl md:text-5xl lg:text-5xl font-medium tracking-tight text-neutral-800 dark:text-white">
          <AnimatedDigit value={value} />
        </span>
      </div>
      <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
        {label}
      </span>
    </div>
  )
}

export function CountdownBanner() {
  const [time, setTime] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTime(getTimeLeft())
    const interval = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <section className="relative w-full px-4 py-24 overflow-hidden flex items-center justify-center min-h-[80vh]">
      <div className="relative w-full max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-[40px] border border-neutral-200 dark:border-neutral-800 bg-neutral-900 p-8 md:p-16 flex flex-col items-center gap-8 md:gap-10 text-center shadow-2xl overflow-hidden"
        >
          {/* Background Image & Overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/bg.jpg"
              alt="Background"
              fill
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-neutral-900/60" />
          </div>

          <div className="flex flex-col items-center gap-4 relative z-10">
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-medium tracking-tight text-white leading-[1.1]">
              Наскоро <span className="font-playfair italic text-brand-primary">доаѓаме</span>
            </h2>

            <p className="text-neutral-300 text-base md:text-lg max-w-xl leading-relaxed">
              Бидете меѓу првите кои ја искусиле револуционерната платформа за водење бизнис.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 relative z-10">
            <TimeUnit value={time?.days ?? 0} label="Денови" />
            <div className="hidden sm:flex items-center justify-center h-12">
              <span className="text-2xl text-neutral-600 animate-pulse font-light">:</span>
            </div>
            <TimeUnit value={time?.hours ?? 0} label="Часови" />
            <div className="hidden sm:flex items-center justify-center h-12">
              <span className="text-2xl text-neutral-600 animate-pulse font-light">:</span>
            </div>
            <TimeUnit value={time?.minutes ?? 0} label="Минути" />
            <div className="hidden sm:flex items-center justify-center h-12">
              <span className="text-2xl text-neutral-600 animate-pulse font-light">:</span>
            </div>
            <TimeUnit value={time?.seconds ?? 0} label="Секунди" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            className="relative w-full max-w-lg mx-auto z-10"
          >
            <form
              action="https://formspree.io/f/xzdyejrr"
              method="POST"
              className="relative w-full"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="Вашата е-пошта"
                className="w-full h-14 pl-6 pr-32 rounded-full bg-neutral-950 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all text-sm font-medium text-white"
              />
              <Button
                type="submit"
                className="absolute right-1 top-1 h-12 px-5 rounded-full shadow-lg shadow-brand-primary/20"
              >
                <span className="hidden sm:inline">Извести ме</span>
                <IconArrowRight className="size-4" />
              </Button>
            </form>
          </motion.div>
        </motion.div>
      </div>



      {/* Background Decorative Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] border border-brand-primary/5 rounded-full -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] border border-brand-primary/5 rounded-full -z-10" />
    </section>
  )
}

export function CTA() {
  return (
    <section className="mx-auto my-20 w-full max-w-6xl px-4 md:px-8">
      <div className="relative overflow-hidden rounded-[40px] bg-neutral-900 p-8 md:p-20 text-center">
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl lg:text-5xl font-medium tracking-tight text-white">
            Подготвени сте за следното <span className="font-playfair italic text-brand-primary">ниво</span>?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-300">
            Започнете со 3 месеци бесплатен пробeн период.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="https://app.opus.mk">
              <Button className="h-14 px-10 rounded-full text-lg shadow-xl shadow-brand-primary/20">
                Започнете сега
                <IconArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/bg.jpg"
            alt="Background"
            fill
            className="object-cover"
          />
        </div>

        {/* Decorative Background Glows */}
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-brand-primary/20 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-brand-primary/10 blur-[100px]" />
      </div>
    </section>
  )
}

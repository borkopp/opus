"use client"

import { motion } from "motion/react"
import { IconMail, IconMapPin, IconPhone, IconSend, IconMessage2, IconBuildingStore } from "@tabler/icons-react"
import { Button } from "@/components/button"
import { FAQs } from "@/components/faqs"
import { CTA } from "@/components/cta"

export default function ContactPage() {
  return (
    <main className="min-h-screen pt-24 pb-16">
      {/* Hero Section */}
      <section className="px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="mb-6 font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
            Контактирајте нè
          </h1>
          <p className="text-lg leading-relaxed text-white/85">
            Тука сме да ви помогнеме да го трансформирате вашиот бизнис. Испратете ни порака и нашиот тим ќе ве контактира во најбрз можен рок.
          </p>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="relative p-8 rounded-xl bg-foreground overflow-hidden text-background shadow-lg group">
            <div className="relative z-10 space-y-8">
              <h2 className="text-2xl font-medium">Директен контакт</h2>

              <div className="flex items-start gap-4">
                <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                  <IconMail className="text-primary size-6" />
                </div>
                <div>
                  <p className="text-sm text-background/60 uppercase tracking-widest font-bold">Е-пошта</p>
                  <p className="text-lg font-medium">hello@opus.com.mk</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                  <IconMapPin className="text-primary size-6" />
                </div>
                <div>
                  <p className="text-sm text-background/60 uppercase tracking-widest font-bold">Локација</p>
                  <p className="text-lg font-medium">Скопје, Македонија</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                  <IconPhone className="text-primary size-6" />
                </div>
                <div>
                  <p className="text-sm text-background/60 uppercase tracking-widest font-bold">Телефон</p>
                  <p className="text-lg font-medium">+389 78 123 456</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-lg border border-border bg-card backdrop-blur-xl">
            <h3 className="text-xl font-medium mb-4 text-foreground">Работно време</h3>
            <ul className="space-y-3">
              <li className="flex justify-between text-muted-foreground">
                <span>Понеделник - Петок</span>
                <span className="font-medium text-foreground">09:00 - 17:00</span>
              </li>
              <li className="flex justify-between text-muted-foreground">
                <span>Сабота</span>
                <span className="font-medium text-foreground">10:00 - 14:00</span>
              </li>
              <li className="flex justify-between text-muted-foreground">
                <span>Недела</span>
                <span className="font-medium text-primary">Затворено</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="p-8 md:p-12 rounded-lg border border-border bg-card backdrop-blur-xl shadow-sm"
        >
          <form
            action="https://formspree.io/f/xzdyejrr"
            method="POST"
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Име и презиме
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Вашето име"
                    className="w-full h-14 pl-12 pr-4 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                  <IconMessage2 className="absolute left-4 top-4 size-5 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Е-пошта
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="email@example.com"
                    className="w-full h-14 pl-12 pr-4 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                  <IconMail className="absolute left-4 top-4 size-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Име на вашиот локал / бизнис
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="business"
                  placeholder="Пр. Салон за убавина 'Опус'"
                className="w-full h-14 pl-12 pr-4 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <IconBuildingStore className="absolute left-4 top-4 size-5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Вашата порака
              </label>
              <textarea
                name="message"
                rows={5}
                required
                placeholder="Напишете ја вашата порака тука..."
                className="w-full p-6 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-lg text-lg shadow-md shadow-primary/20 gap-2"
            >
              <span>Испрати порака</span>
              <IconSend className="size-5" />
            </Button>
          </form>
        </motion.div>
      </section>
      <FAQs />
      <CTA />
    </main>
  )
}

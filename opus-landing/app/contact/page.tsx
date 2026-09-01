"use client"

import { motion } from "motion/react"
import { IconMail, IconMapPin, IconPhone, IconSend, IconMessage2, IconBuildingStore } from "@tabler/icons-react"
import { Button } from "@/components/button"
import Image from "next/image"
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
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-neutral-900 dark:text-white mb-6">
            Контактирајте <span className="font-playfair italic text-brand-primary">нè</span>
          </h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed">
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
          <div className="relative p-8 rounded-[40px] bg-neutral-900 overflow-hidden text-white shadow-2xl group">
            <Image
              src="/bg.jpg"
              alt="Background"
              fill
              className="object-cover opacity-30 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-neutral-900/60" />

            <div className="relative z-10 space-y-8">
              <h2 className="text-2xl font-medium">Директен контакт</h2>

              <div className="flex items-start gap-4">
                <div className="size-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shrink-0">
                  <IconMail className="text-brand-primary size-6" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400 uppercase tracking-widest font-bold">Е-пошта</p>
                  <p className="text-lg font-medium">hello@opus.com.mk</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="size-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shrink-0">
                  <IconMapPin className="text-brand-primary size-6" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400 uppercase tracking-widest font-bold">Локација</p>
                  <p className="text-lg font-medium">Скопје, Македонија</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="size-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shrink-0">
                  <IconPhone className="text-brand-primary size-6" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400 uppercase tracking-widest font-bold">Телефон</p>
                  <p className="text-lg font-medium">+389 78 123 456</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-[40px] border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 backdrop-blur-xl">
            <h3 className="text-xl font-medium mb-4 dark:text-white">Работно време</h3>
            <ul className="space-y-3">
              <li className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Понеделник - Петок</span>
                <span className="font-medium text-neutral-900 dark:text-white">09:00 - 17:00</span>
              </li>
              <li className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Сабота</span>
                <span className="font-medium text-neutral-900 dark:text-white">10:00 - 14:00</span>
              </li>
              <li className="flex justify-between text-neutral-500 dark:text-neutral-400">
                <span>Недела</span>
                <span className="font-medium text-brand-primary">Затворено</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="p-8 md:p-12 rounded-[40px] border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/30 backdrop-blur-xl shadow-sm"
        >
          <form
            action="https://formspree.io/f/xzdyejrr"
            method="POST"
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ml-1">
                  Име и презиме
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Вашето име"
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all dark:text-white"
                  />
                  <IconMessage2 className="absolute left-4 top-4 size-5 text-neutral-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ml-1">
                  Е-пошта
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="email@example.com"
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all dark:text-white"
                  />
                  <IconMail className="absolute left-4 top-4 size-5 text-neutral-400" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ml-1">
                Име на вашиот локал / бизнис
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="business"
                  placeholder="Пр. Салон за убавина 'Опус'"
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all dark:text-white"
                />
                <IconBuildingStore className="absolute left-4 top-4 size-5 text-neutral-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ml-1">
                Вашата порака
              </label>
              <textarea
                name="message"
                rows={5}
                required
                placeholder="Напишете ја вашата порака тука..."
                className="w-full p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all dark:text-white resize-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl text-lg shadow-xl shadow-brand-primary/20 gap-2"
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

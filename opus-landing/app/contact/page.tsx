"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconMail,
  IconMapPin,
  IconPhone,
  IconSend,
  IconMessage2,
  IconBuildingStore,
  IconCheck,
  IconLoader2,
  IconAlertCircle,
} from "@tabler/icons-react";
import { Button } from "@/components/button";
import Image from "next/image";
import { FAQs } from "@/components/faqs";
import { LaunchBanner } from "@/components/cta";
import { useI18n } from "@/components/i18n-provider";

export default function ContactPage() {
  const { messages } = useI18n();
  const copy = messages.contact;

  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("https://formspree.io/f/xzdyejrr", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        setStatus("success");
      } else {
        const data = await response.json().catch(() => null);
        if (data && Array.isArray(data.errors) && data.errors.length > 0) {
          const errorText = data.errors
            .map((err: { message?: string }) => err.message)
            .filter(Boolean)
            .join(", ");
          setErrorMessage(errorText || copy.errorMessage);
        } else {
          setErrorMessage(copy.errorMessage);
        }
        setStatus("error");
      }
    } catch {
      setErrorMessage(copy.errorMessage);
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen pt-24 pb-16">
      {/* Hero Section */}
      <section className="px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl"
        >
          <h1 className="mb-6 text-4xl font-medium tracking-tight text-neutral-900 md:text-6xl dark:text-white">
            {copy.heading}{" "}
            <span className="font-lora text-brand-primary italic">
              {copy.headingAccent}
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
            {copy.description}
          </p>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 px-4 lg:grid-cols-2">
        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="group relative overflow-hidden rounded-[40px] bg-neutral-900 p-8 text-white shadow-2xl">
            <Image
              src="/bg.jpg"
              alt=""
              fill
              className="object-cover opacity-30 transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-neutral-900/60" />

            <div className="relative z-10 space-y-8">
              <h2 className="text-2xl font-medium">{copy.directContact}</h2>

              <div className="flex items-start gap-4">
                <div className="bg-brand-primary/20 border-brand-primary/30 flex size-12 shrink-0 items-center justify-center rounded-2xl border">
                  <IconMail className="text-brand-primary size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-widest text-neutral-400 uppercase">
                    {copy.email}
                  </p>
                  <p className="text-lg font-medium">hello@opus.mk</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-brand-primary/20 border-brand-primary/30 flex size-12 shrink-0 items-center justify-center rounded-2xl border">
                  <IconMapPin className="text-brand-primary size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-widest text-neutral-400 uppercase">
                    {copy.location}
                  </p>
                  <p className="text-lg font-medium">{copy.locationValue}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-brand-primary/20 border-brand-primary/30 flex size-12 shrink-0 items-center justify-center rounded-2xl border">
                  <IconPhone className="text-brand-primary size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-widest text-neutral-400 uppercase">
                    {copy.phone}
                  </p>
                  <p className="text-lg font-medium">+389 77 826 333</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="rounded-[40px] border border-neutral-200 bg-white p-8 shadow-sm backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/30"
        >
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.4 }}
                className="flex min-h-[420px] flex-col items-center justify-center py-8 text-center"
              >
                <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shadow-lg shadow-emerald-500/10 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <IconCheck className="size-10 stroke-[2.5]" />
                </div>
                <h3 className="mb-3 text-2xl font-medium tracking-tight text-neutral-900 md:text-3xl dark:text-white">
                  {copy.successTitle}
                </h3>
                <p className="mb-8 max-w-md text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {copy.successDescription}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStatus("idle");
                    setErrorMessage(null);
                  }}
                  className="h-12 rounded-2xl px-6 text-base"
                >
                  {copy.sendAnother}
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {status === "error" && (
                  <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                    <IconAlertCircle className="size-5 shrink-0" />
                    <p>{errorMessage || copy.errorMessage}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="ml-1 text-sm font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                      {copy.fullName}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        required
                        disabled={status === "submitting"}
                        placeholder={copy.namePlaceholder}
                        className="focus:ring-brand-primary/30 h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pr-4 pl-12 transition-all focus:ring-2 focus:outline-none disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                      />
                      <IconMessage2 className="absolute top-4 left-4 size-5 text-neutral-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="ml-1 text-sm font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                      {copy.email}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        required
                        disabled={status === "submitting"}
                        placeholder="email@example.com"
                        className="focus:ring-brand-primary/30 h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pr-4 pl-12 transition-all focus:ring-2 focus:outline-none disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                      />
                      <IconMail className="absolute top-4 left-4 size-5 text-neutral-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-sm font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                    {copy.business}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="business"
                      disabled={status === "submitting"}
                      placeholder={copy.businessPlaceholder}
                      className="focus:ring-brand-primary/30 h-14 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pr-4 pl-12 transition-all focus:ring-2 focus:outline-none disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                    />
                    <IconBuildingStore className="absolute top-4 left-4 size-5 text-neutral-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-sm font-bold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                    {copy.message}
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    required
                    disabled={status === "submitting"}
                    placeholder={copy.messagePlaceholder}
                    className="focus:ring-brand-primary/30 w-full resize-none rounded-3xl border border-neutral-200 bg-neutral-50 p-6 transition-all focus:ring-2 focus:outline-none disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={status === "submitting"}
                  className="shadow-brand-primary/20 h-14 w-full gap-2 rounded-2xl text-lg shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "submitting" ? (
                    <>
                      <IconLoader2 className="size-5 animate-spin" />
                      <span>{copy.submitting}</span>
                    </>
                  ) : (
                    <>
                      <span>{copy.submit}</span>
                      <IconSend className="size-5" />
                    </>
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </section>
      <FAQs />
      <LaunchBanner />
    </main>
  );
}

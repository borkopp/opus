"use client";

import React, { useRef, useEffect, useState, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Heading } from "@/components/heading";
import { Subheading } from "@/components/subheading";
import { cn } from "@/lib/utils";
import { IconPlus } from "@tabler/icons-react";
import { GridLineHorizontal, GridLineVertical } from "./grid-lines";
import { useI18n } from "./i18n-provider";
import { landingCopy } from "@/lib/landing-copy";
import { siteLinks } from "@/lib/site-links";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

export function FAQs() {
  const { locale, messages } = useI18n();
  const copy = messages.faq;
  const faqData: FAQSection[] = copy.sections;
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const faqId = useId();
  const reducedMotion = useReducedMotion();
  const [keyboard, setKeyboard] = useState(false);
  const duration = reducedMotion || keyboard ? 0 : 0.2;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setActiveId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleQuestion = (id: string) => {
    setActiveId(activeId === id ? null : id);
  };

  return (
    <div className="mx-auto max-w-4xl overflow-hidden px-4 py-20 md:px-8 md:py-32">
      <div className="text-center">
        <Heading as="h2">
          {copy.heading}{" "}
          <span className="text-brand-primary font-lora italic">
            {copy.headingAccent}
          </span>{" "}
          {copy.headingEnd}
        </Heading>
        <Subheading className="mx-auto mt-4 max-w-2xl">
          {copy.description}
        </Subheading>
      </div>

      <div
        ref={containerRef}
        className="relative mt-16 flex flex-col gap-12 px-4 md:px-8"
        onKeyDownCapture={() => setKeyboard(true)}
        onPointerDownCapture={() => setKeyboard(false)}
      >
        {faqData.map((section, sectionIndex) => (
          <div key={section.title}>
            <h3 className="mb-6 text-lg font-medium text-neutral-800 dark:text-neutral-200">
              {section.title}
            </h3>
            <div className="flex flex-col gap-3">
              {section.items.map((item, index) => {
                const id = `${faqId}-${sectionIndex}-${index}`;
                const isActive = activeId === id;

                return (
                  <div
                    key={id}
                    className={cn(
                      "relative rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-white shadow-sm ring-1 shadow-black/10 ring-black/10 dark:bg-neutral-900 dark:shadow-white/5 dark:ring-white/10"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                    )}
                  >
                    {isActive && (
                      <div className="pointer-events-none absolute inset-0">
                        <GridLineHorizontal
                          className="-top-[2px]"
                          offset="100px"
                        />
                        <GridLineHorizontal
                          className="-bottom-[2px]"
                          offset="100px"
                        />
                        <GridLineVertical
                          className="-left-[2px]"
                          offset="100px"
                        />
                        <GridLineVertical
                          className="-right-[2px] left-auto"
                          offset="100px"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      id={`${id}-question`}
                      aria-expanded={isActive}
                      aria-controls={isActive ? `${id}-answer` : undefined}
                      onClick={() => toggleQuestion(id)}
                      className="focus-visible:outline-ring flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-4 text-left outline-offset-2 focus-visible:outline-2"
                    >
                      <span className="text-sm font-medium text-neutral-700 md:text-base dark:text-neutral-300">
                        {item.question}
                      </span>
                      <motion.div
                        animate={{ rotate: isActive ? 45 : 0 }}
                        transition={{ duration }}
                        className="ml-4 shrink-0"
                      >
                        <IconPlus className="size-5 text-neutral-500 dark:text-neutral-400" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          id={`${id}-answer`}
                          role="region"
                          aria-labelledby={`${id}-question`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
                          className="relative overflow-hidden"
                        >
                          <p className="max-w-[90%] px-4 pb-4 text-sm text-neutral-600 dark:text-neutral-400">
                            {item.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground mt-12 text-center text-sm">
        {landingCopy[locale].faqContact}{" "}
        <Link
          href={siteLinks.contact}
          className="text-foreground decoration-border hover:text-brand-primary underline underline-offset-4 transition-colors"
        >
          {landingCopy[locale].faqContactLink}
        </Link>
      </p>
    </div>
  );
}

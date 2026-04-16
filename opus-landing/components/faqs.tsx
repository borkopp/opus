"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heading } from "@/components/heading";
import { Subheading } from "@/components/subheading";
import { cn } from "@/lib/utils";
import { IconPlus } from "@tabler/icons-react";
import { GridLineHorizontal, GridLineVertical } from "./grid-lines";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const faqData: FAQSection[] = [
  {
    title: "Општи прашања",
    items: [
      {
        question: "Што е OPUS?",
        answer: "OPUS е платформа сè-во-едно дизајнирана за салони за убавина, берберници и ресторани. Таа ги обединува вашите резервации, вработени, услуги и наплата на едно место."
      },
      {
        question: "Дали ми е потребна кредитна картичка за тест периодот?",
        answer: "Не, можете да започнете со бесплатниот пробен период од 3 месеци без да внесувате податоци од кредитна картичка."
      },
      {
        question: "Дали можам да откажам во секое време?",
        answer: "Да, по истекот на трите бесплатни месеци, плаќате 20 евра месечно. Можете да ја откажете вашата претплата во било кое време, без обврски."
      }
    ]
  },
  {
    title: "Можности и интеграции",
    items: [
      {
        question: "Како функционира AI асистентот?",
        answer: "AI асистентот може да комуницира со вашите клиенти преку веб-сајтот, одговарајќи на нивните прашања за вашите услуги, слободни термини и помага да го резервираат својот термин автоматски."
      },
      {
        question: "Дали можам да примам плаќања онлајн?",
        answer: "Да, OPUS е целосно интегриран со системи за плаќање што овозможува сигурна наплата на вашите услуги или задршка на депозит пред терминот."
      }
    ]
  }
];


export function FAQs() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        <Heading as="h2">Најчесто <span className="text-brand-primary font-playfair italic">поставувани</span> прашања</Heading>
        <Subheading className="mx-auto mt-4 max-w-2xl">
          Сè што треба да знаете за OPUS и како може да го подобри вашиот бизнис.
        </Subheading>
      </div>

      <div
        ref={containerRef}
        className="relative mt-16 flex flex-col gap-12 px-4 md:px-8"
      >
        {faqData.map((section) => (
          <div key={section.title}>
            <h3 className="mb-6 text-lg font-medium text-neutral-800 dark:text-neutral-200">
              {section.title}
            </h3>
            <div className="flex flex-col gap-3">
              {section.items.map((item, index) => {
                const id = `${section.title}-${index}`;
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
                      <div className="absolute inset-0">
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
                      onClick={() => toggleQuestion(id)}
                      className="flex w-full items-center justify-between px-4 py-4 text-left"
                    >
                      <span className="text-sm font-medium text-neutral-700 md:text-base dark:text-neutral-300">
                        {item.question}
                      </span>
                      <motion.div
                        animate={{ rotate: isActive ? 45 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-4 shrink-0"
                      >
                        <IconPlus className="size-5 text-neutral-500 dark:text-neutral-400" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15, ease: "easeInOut" }}
                          className="relative"
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
    </div>
  );
}

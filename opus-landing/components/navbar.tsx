"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/button";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const { scrollY } = useScroll();

  const paddingHorizontal = useTransform(scrollY, [0, 50], [0, 16]);
  const paddingVertical = useTransform(scrollY, [0, 50], [0, 8]);
  const isOverSky = pathname === "/" && !hasScrolled;

  useMotionValueEvent(scrollY, "change", (latest) => {
    setHasScrolled(latest > 10);

    const scrollingDown = latest > lastScrollY.current;
    const scrollDelta = Math.abs(latest - lastScrollY.current);

    if (scrollDelta > 5) {
      if (scrollingDown && latest > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = latest;
    }
  });

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{
        y: isVisible ? 0 : -100,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{
        paddingLeft: paddingHorizontal,
        paddingRight: paddingHorizontal,
        paddingTop: paddingVertical,
      }}
      className="fixed inset-x-0 z-50 mx-auto w-full max-w-7xl"
    >
      <motion.div
        animate={{
          borderRadius: hasScrolled ? 24 : 0,
          backdropFilter: hasScrolled ? "blur(12px)" : "blur(0px)",
        }}
        transition={{ duration: 0.3 }}
        className={`flex h-14 items-center justify-between px-4 transition-colors duration-300 sm:h-16 md:px-8 ${
          hasScrolled
            ? "bg-background/85 border-border/70 border-b shadow-sm"
            : "bg-transparent shadow-none"
        }`}
        data-scrolled={hasScrolled}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Logo
            className={cn(
              "text-xl transition-colors duration-300 md:text-3xl",
              isOverSky && "text-white",
            )}
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 lg:flex lg:gap-8">
          <Link
            href="/#product"
            className={cn(
              "text-sm font-medium transition-colors",
              isOverSky
                ? "text-white/90 hover:text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Платформа
          </Link>

          <Link
            href="/contact"
            className={cn(
              "text-sm font-medium transition-colors",
              isOverSky
                ? "text-white/90 hover:text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Контакт
          </Link>
        </div>

        {/* Desktop Right Side */}
        <div className="hidden items-center gap-3 lg:flex lg:gap-4">
          <Link href="https://studio.opus.mk">
            <Button
              className={cn(
                "px-4 py-2 text-sm",
                isOverSky &&
                  "text-primary bg-white hover:bg-white/90 hover:shadow-black/10",
              )}
            >
              Отворете OPUS
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex size-10 items-center justify-center rounded-md lg:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <CloseIcon
              className={cn(
                "size-5 transition-colors",
                isOverSky ? "text-white" : "text-foreground",
              )}
            />
          ) : (
            <MenuIcon
              className={cn(
                "size-5 transition-colors",
                isOverSky ? "text-white" : "text-foreground",
              )}
            />
          )}
        </button>
      </motion.div>

      {/* Mobile Menu - Full Screen Overlay */}
      <motion.div
        initial={false}
        animate={{
          opacity: mobileMenuOpen ? 1 : 0,
          y: mobileMenuOpen ? 0 : -20,
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`bg-background fixed inset-0 top-14 z-40 flex flex-col sm:top-16 lg:hidden ${
          mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-2">
            <Link
              href="#"
              onClick={() => setMobileMenuOpen(false)}
              className="text-foreground hover:bg-muted rounded-lg px-4 py-3.5 text-base font-medium transition-colors"
            >
              Платформа
            </Link>

            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="text-foreground hover:bg-muted rounded-lg px-4 py-3.5 text-base font-medium transition-colors"
            >
              Контакт
            </Link>
          </div>

          {/* Bottom section with login and CTA */}
          <div className="mt-auto pt-6">
            {/* Dotted gradient divider - light mode */}
            <div className="bg-border mb-6 h-px w-full" />
            <Link
              href="https://studio.opus.mk"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button className="mt-3 w-full rounded-xl px-4 py-3.5 text-base">
                Отворете OPUS
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.nav>
  );
};

const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
};

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
};

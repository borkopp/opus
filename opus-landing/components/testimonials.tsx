"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { Button } from "./button";

export function Testimonials() {
  return (
    <>
      {/* Desktop: Canvas experience */}
      <div className="hidden md:block">
        <TestimonialsCanvas>
          <div className="flex h-full items-center justify-center">
            <div className="max-w-2xl px-4 text-center">
              <Heading>
                Loved by thousands <br /> of happy customers
              </Heading>
              <Subheading className="mx-auto mt-4 max-w-md text-base text-neutral-500 md:text-lg dark:text-neutral-400">
                Hear from our community of builders, designers, and creators who
                trust us to power their projects.
              </Subheading>
              <Button className="mt-8">
                Read all reviews
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </TestimonialsCanvas>
      </div>

      {/* Mobile: Scrolling list */}
      <div className="block md:hidden">
        <TestimonialsMobile />
      </div>
    </>
  );
}

function TestimonialsMobile() {
  return (
    <section className="bg-white py-16 dark:bg-neutral-950">
      <div className="px-4">
        <div className="text-center">
          <Heading>
            Loved by thousands <br /> of happy customers
          </Heading>
          <Subheading className="mx-auto mt-4 max-w-md text-base text-neutral-500 dark:text-neutral-400">
            Hear from our community of builders, designers, and creators who
            trust us to power their projects.
          </Subheading>
          <Button className="mt-8">
            Read all reviews
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Button>
        </div>

        <div className="mt-12 flex flex-col gap-4">
          {DEFAULT_TESTIMONIALS.slice(0, 6).map((testimonial, index) => (
            <MobileTestimonialCard
              key={index}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MobileTestimonialCard({
  testimonial,
  index,
}: {
  testimonial: Testimonial;
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10"
    >
      <p className="text-base leading-snug font-semibold text-neutral-800 dark:text-neutral-100">
        &ldquo;{testimonial.title}&rdquo;
      </p>
      <p className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        {testimonial.quote}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Image
          width={50}
          height={50}
          src={testimonial.imageSrc}
          alt={testimonial.name}
          className="size-8 rounded-full object-cover"
          loading="lazy"
        />
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {testimonial.name}
        </span>
      </div>
    </motion.div>
  );
}

// Default testimonials data
const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    title: "Best investment for our startup",
    quote:
      "We deployed AI agents that automated our entire workflow overnight. The autonomous execution is exactly what we needed.",
    imageSrc: "https://assets.aceternity.com/avatars/manu.webp",
    name: "Sarah Chen",
  },
  {
    title: "Exceeded all expectations",
    quote:
      "The AI agents handle complex decisions while we sleep. Our team's productivity has increased tenfold since we started using it.",
    imageSrc: "https://assets.aceternity.com/avatars/1.webp",
    name: "Marcus Johnson",
  },
  {
    title: "Game changer for our team",
    quote:
      "Orchestrating intelligent workflows used to take weeks of manual work. Now our AI agents handle everything autonomously.",
    imageSrc: "https://assets.aceternity.com/avatars/2.webp",
    name: "Emily Rodriguez",
  },
  {
    title: "Worth every penny",
    quote:
      "Building and deploying AI agents is incredibly simple. Our automation runs 24/7 without any human intervention.",
    imageSrc: "https://assets.aceternity.com/avatars/3.webp",
    name: "David Park",
  },
  {
    title: "Our secret weapon",
    quote:
      "The autonomous AI workflows give us a competitive edge. Tasks that took hours are now executed automatically in minutes.",
    imageSrc: "https://assets.aceternity.com/avatars/4.webp",
    name: "Lisa Thompson",
  },
  {
    title: "Incredible developer experience",
    quote:
      "Deploy, orchestrate, automate. The platform makes building intelligent AI agents straightforward and powerful.",
    imageSrc: "https://assets.aceternity.com/avatars/5.webp",
    name: "James Wilson",
  },
  {
    title: "Saved us months of work",
    quote:
      "We automated complex decision-making workflows that we thought would require a dedicated team. The agents just work.",
    imageSrc: "https://assets.aceternity.com/avatars/6.webp",
    name: "Priya Patel",
  },
  {
    title: "The automation is seamless",
    quote:
      "Our AI agents make decisions and execute tasks while we focus on strategy. It's like having a tireless team working around the clock.",
    imageSrc: "https://assets.aceternity.com/avatars/7.webp",
    name: "Alex Turner",
  },
  {
    title: "Perfect for scaling operations",
    quote:
      "We went from manual workflows to fully autonomous AI agents in days. The orchestration capabilities are unmatched.",
    imageSrc: "https://assets.aceternity.com/avatars/8.webp",
    name: "Nina Kowalski",
  },
  {
    title: "Clients love the results",
    quote:
      "Every workflow we automate delivers consistent, intelligent results. The AI agents have elevated our entire operation.",
    imageSrc: "https://assets.aceternity.com/avatars/9.webp",
    name: "Robert Kim",
  },
  {
    title: "Best in class AI automation",
    quote:
      "After trying every automation platform, this is the one that delivers. The intelligent agents handle complexity effortlessly.",
    imageSrc: "https://assets.aceternity.com/avatars/10.webp",
    name: "Olivia Martinez",
  },
  {
    title: "An engineer's dream platform",
    quote:
      "Building autonomous AI workflows feels intuitive. The agents are powerful enough to handle any task we throw at them.",
    imageSrc: "https://assets.aceternity.com/avatars/11.webp",
    name: "Chris Anderson",
  },
  {
    title: "Supercharged our workflow",
    quote:
      "We integrated AI agents into every part of our operation. They work while we sleep and deliver results by morning.",
    imageSrc: "https://assets.aceternity.com/avatars/12.webp",
    name: "Aisha Mohammed",
  },
  {
    title: "The orchestration is flawless",
    quote:
      "Complex multi-step workflows run autonomously without any issues. The decision-making capabilities are remarkably intelligent.",
    imageSrc: "https://assets.aceternity.com/avatars/13.webp",
    name: "Tom Bradley",
  },
  {
    title: "Highly recommend to every team",
    quote:
      "If you want AI agents that actually work autonomously and deliver real results, this platform is exactly what you need.",
    imageSrc: "https://assets.aceternity.com/avatars/14.webp",
    name: "Maya Singh",
  },
  {
    title: "Our go-to automation platform",
    quote:
      "We've standardized on this for all our AI workflows. The autonomous agents have transformed how we operate.",
    imageSrc: "https://assets.aceternity.com/avatars/15.webp",
    name: "Daniel Lee",
  },
];

interface Testimonial {
  title: string;
  quote: string;
  imageSrc: string;
  name: string;
}

interface TestimonialCardItem {
  id: string;
  testimonial: Testimonial;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

// Seeded random number generator for consistent tile generation
function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Check if two rectangles overlap (with padding)
function rectanglesOverlap(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number,
  padding: number = 20,
): boolean {
  return !(
    x1 + w1 + padding < x2 ||
    x2 + w2 + padding < x1 ||
    y1 + h1 + padding < y2 ||
    y2 + h2 + padding < y1
  );
}

// Check if a card overlaps with the center exclusion zone (in world coordinates)
function isInWorldCenterZone(
  absoluteX: number,
  absoluteY: number,
  width: number,
  height: number,
  exclusionWidth: number,
  exclusionHeight: number,
): boolean {
  const zoneLeft = -exclusionWidth / 2;
  const zoneRight = exclusionWidth / 2;
  const zoneTop = -exclusionHeight / 2;
  const zoneBottom = exclusionHeight / 2;

  const cardRight = absoluteX + width;
  const cardBottom = absoluteY + height;

  return !(
    cardRight < zoneLeft ||
    absoluteX > zoneRight ||
    cardBottom < zoneTop ||
    absoluteY > zoneBottom
  );
}

// Generate testimonial cards for a tile based on its position
function generateTileCards(
  tileX: number,
  tileY: number,
  tileSize: number,
  testimonials: Testimonial[],
  cardCount: number = 4,
  exclusionWidth: number = 700,
  exclusionHeight: number = 600,
  randomRotate: boolean = false,
): TestimonialCardItem[] {
  const seed = tileX * 10000 + tileY;
  const random = seededRandom(seed);

  const cards: TestimonialCardItem[] = [];
  const maxAttempts = 100;

  // Minimum gap between cards for even spacing
  const minGap = 80;

  for (let i = 0; i < cardCount; i++) {
    const testimonialIndex =
      Math.abs(tileX * cardCount + tileY + i) % testimonials.length;

    // Testimonial cards - wider rectangular shape
    const baseWidth = 380 + random() * 60;
    const height = 200 + random() * 30;

    let x = 0;
    let y = 0;
    let attempts = 0;
    let validPosition = false;

    while (attempts < maxAttempts && !validPosition) {
      x = random() * (tileSize - baseWidth - 80) + 40;
      y = random() * (tileSize - height - 80) + 40;

      const absoluteX = tileX * tileSize + x;
      const absoluteY = tileY * tileSize + y;

      if (
        isInWorldCenterZone(
          absoluteX,
          absoluteY,
          baseWidth,
          height,
          exclusionWidth,
          exclusionHeight,
        )
      ) {
        attempts++;
        continue;
      }

      validPosition = true;
      for (const existingCard of cards) {
        if (
          rectanglesOverlap(
            x,
            y,
            baseWidth,
            height,
            existingCard.x,
            existingCard.y,
            existingCard.width,
            existingCard.height,
            minGap,
          )
        ) {
          validPosition = false;
          break;
        }
      }

      attempts++;
    }

    if (validPosition) {
      const rotation = randomRotate ? random() * 16 - 8 : 0;

      cards.push({
        id: `${tileX}-${tileY}-${i}`,
        testimonial: testimonials[testimonialIndex],
        x,
        y,
        width: baseWidth,
        height,
        rotation,
      });
    }
  }

  return cards;
}

// Easing function for smooth animation
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface FocusPosition {
  x: number;
  y: number;
  cardWidth: number;
  cardHeight: number;
  cardId: string;
}

// Generate fixed focus positions for auto-pan (deterministic based on seed)
function generateFocusPositions(
  count: number,
  tileSize: number,
  testimonials: Testimonial[],
  cardsPerTile: number,
  exclusionWidth: number,
  exclusionHeight: number,
): FocusPosition[] {
  const positions: FocusPosition[] = [];

  // Generate positions from tiles around the origin
  const tileRange = 3;
  for (let tx = -tileRange; tx <= tileRange && positions.length < count; tx++) {
    for (
      let ty = -tileRange;
      ty <= tileRange && positions.length < count;
      ty++
    ) {
      // Skip the center tile (exclusion zone)
      if (tx === 0 && ty === 0) continue;

      const cards = generateTileCards(
        tx,
        ty,
        tileSize,
        testimonials,
        cardsPerTile,
        exclusionWidth,
        exclusionHeight,
        false,
      );

      // Pick one card from this tile if available
      if (cards.length > 0) {
        const card = cards[0];
        const absoluteX = tx * tileSize + card.x;
        const absoluteY = ty * tileSize + card.y;
        positions.push({
          x: absoluteX + card.width / 2,
          y: absoluteY + card.height / 2,
          cardWidth: card.width,
          cardHeight: card.height,
          cardId: card.id,
        });
      }
    }
  }

  return positions;
}

interface TestimonialsCanvasProps {
  testimonials?: Testimonial[];
  tileSize?: number;
  cardsPerTile?: number;
  className?: string;
  children?: React.ReactNode;
  centerExclusionWidth?: number;
  centerExclusionHeight?: number;
  randomRotate?: boolean;
  autoPanInterval?: number;
  autoPanDuration?: number;
}

export function TestimonialsCanvas({
  testimonials = DEFAULT_TESTIMONIALS,
  tileSize = 800,
  cardsPerTile = 4,
  className,
  children,
  centerExclusionWidth = 700,
  centerExclusionHeight = 600,
  randomRotate = false,
  autoPanInterval = 3000,
  autoPanDuration = 1200,
}: TestimonialsCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Auto-pan refs
  const autoPanRafRef = useRef<number | null>(null);
  const autoPanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoPanningRef = useRef(false);
  const focusIndexRef = useRef(0);
  const focusPositionsRef = useRef<FocusPosition[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [visibleTiles, setVisibleTiles] = useState<
    { tileX: number; tileY: number; cards: TestimonialCardItem[] }[]
  >([]);

  // Calculate visible tiles based on current offset
  const updateVisibleTiles = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    const { x, y } = offsetRef.current;

    const buffer = 1;
    const startTileX = Math.floor(x / tileSize) - buffer;
    const startTileY = Math.floor(y / tileSize) - buffer;
    const endTileX = Math.ceil((x + width) / tileSize) + buffer;
    const endTileY = Math.ceil((y + height) / tileSize) + buffer;

    const tiles: {
      tileX: number;
      tileY: number;
      cards: TestimonialCardItem[];
    }[] = [];

    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        tiles.push({
          tileX: tx,
          tileY: ty,
          cards: generateTileCards(
            tx,
            ty,
            tileSize,
            testimonials,
            cardsPerTile,
            centerExclusionWidth,
            centerExclusionHeight,
            randomRotate,
          ),
        });
      }
    }

    setVisibleTiles(tiles);
  }, [
    tileSize,
    testimonials,
    cardsPerTile,
    centerExclusionWidth,
    centerExclusionHeight,
    randomRotate,
  ]);

  // Update transform directly without React re-render
  const updateTransform = useCallback(() => {
    if (contentRef.current) {
      const { x, y } = offsetRef.current;
      contentRef.current.style.transform = `translate3d(${-x}px, ${-y}px, 0)`;
    }
  }, []);

  // Animation loop for momentum - using useRef to avoid stale closure
  const animateRef = useRef<() => void>(() => {});

  useEffect(() => {
    animateRef.current = () => {
      if (isDraggingRef.current) {
        rafRef.current = requestAnimationFrame(animateRef.current);
        return;
      }

      const friction = 0.95;
      const minVelocity = 0.5;

      velocityRef.current.x *= friction;
      velocityRef.current.y *= friction;

      if (
        Math.abs(velocityRef.current.x) > minVelocity ||
        Math.abs(velocityRef.current.y) > minVelocity
      ) {
        offsetRef.current.x -= velocityRef.current.x;
        offsetRef.current.y -= velocityRef.current.y;
        updateTransform();
        updateVisibleTiles();
        rafRef.current = requestAnimationFrame(animateRef.current);
      } else {
        velocityRef.current = { x: 0, y: 0 };
      }
    };
  }, [updateTransform, updateVisibleTiles]);

  const animate = useCallback(() => {
    animateRef.current();
  }, []);

  // Auto-pan to next testimonial - using useRef to avoid stale closure
  const panToNextTestimonialRef = useRef<() => void>(() => {});

  useEffect(() => {
    panToNextTestimonialRef.current = () => {
      if (isDraggingRef.current || isAutoPanningRef.current) return;

      const container = containerRef.current;
      if (!container || focusPositionsRef.current.length === 0) return;

      const { width, height } = container.getBoundingClientRect();

      // Get next focus position
      focusIndexRef.current =
        (focusIndexRef.current + 1) % focusPositionsRef.current.length;
      const target = focusPositionsRef.current[focusIndexRef.current];

      // Calculate target offset to center this testimonial
      // The testimonial should appear well above the hero text so hero is visible
      const targetX = target.x - width / 2;
      const targetY = target.y - height / 2 + 280; // Offset further up so hero text is visible below

      const startX = offsetRef.current.x;
      const startY = offsetRef.current.y;
      const deltaX = targetX - startX;
      const deltaY = targetY - startY;

      const startTime = performance.now();
      isAutoPanningRef.current = true;

      const animateAutoPan = (currentTime: number) => {
        if (isDraggingRef.current) {
          isAutoPanningRef.current = false;
          setActiveCardId(null);
          return;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / autoPanDuration, 1);
        const easedProgress = easeOutCubic(progress);

        offsetRef.current.x = startX + deltaX * easedProgress;
        offsetRef.current.y = startY + deltaY * easedProgress;

        updateTransform();
        updateVisibleTiles();

        if (progress < 1) {
          autoPanRafRef.current = requestAnimationFrame(animateAutoPan);
        } else {
          isAutoPanningRef.current = false;
          // Set the active card when animation completes
          setActiveCardId(target.cardId);
          // Schedule next auto-pan
          if (!isDraggingRef.current) {
            autoPanTimerRef.current = setTimeout(
              panToNextTestimonialRef.current,
              autoPanInterval,
            );
          }
        }
      };

      autoPanRafRef.current = requestAnimationFrame(animateAutoPan);
    };
  }, [autoPanDuration, autoPanInterval, updateTransform, updateVisibleTiles]);

  const panToNextTestimonial = useCallback(() => {
    panToNextTestimonialRef.current();
  }, []);

  // Start auto-pan cycle
  const startAutoPan = useCallback(() => {
    if (autoPanTimerRef.current) {
      clearTimeout(autoPanTimerRef.current);
    }
    autoPanTimerRef.current = setTimeout(panToNextTestimonial, autoPanInterval);
  }, [autoPanInterval, panToNextTestimonial]);

  // Stop auto-pan
  const stopAutoPan = useCallback(() => {
    if (autoPanTimerRef.current) {
      clearTimeout(autoPanTimerRef.current);
      autoPanTimerRef.current = null;
    }
    if (autoPanRafRef.current) {
      cancelAnimationFrame(autoPanRafRef.current);
      autoPanRafRef.current = null;
    }
    isAutoPanningRef.current = false;
    setActiveCardId(null);
  }, []);

  // Mouse drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = Date.now();
      velocityRef.current = { x: 0, y: 0 };

      // Stop auto-pan when user starts dragging
      stopAutoPan();

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    },
    [stopAutoPan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;

      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      const now = Date.now();
      const dt = now - lastTimeRef.current;

      if (dt > 0) {
        velocityRef.current.x = (dx / dt) * 16;
        velocityRef.current.y = (dy / dt) * 16;
      }

      offsetRef.current.x -= dx;
      offsetRef.current.y -= dy;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = now;

      updateTransform();
      updateVisibleTiles();
    },
    [updateTransform, updateVisibleTiles],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    rafRef.current = requestAnimationFrame(animate);
    // Resume auto-pan after momentum settles
    startAutoPan();
  }, [animate, startAutoPan]);

  // Touch drag handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      isDraggingRef.current = true;
      setIsDragging(true);
      lastPosRef.current = { x: touch.clientX, y: touch.clientY };
      lastTimeRef.current = Date.now();
      velocityRef.current = { x: 0, y: 0 };

      // Stop auto-pan when user starts dragging
      stopAutoPan();

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    },
    [stopAutoPan],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();

      const touch = e.touches[0];
      const dx = touch.clientX - lastPosRef.current.x;
      const dy = touch.clientY - lastPosRef.current.y;
      const now = Date.now();
      const dt = now - lastTimeRef.current;

      if (dt > 0) {
        velocityRef.current.x = (dx / dt) * 16;
        velocityRef.current.y = (dy / dt) * 16;
      }

      offsetRef.current.x -= dx;
      offsetRef.current.y -= dy;
      lastPosRef.current = { x: touch.clientX, y: touch.clientY };
      lastTimeRef.current = now;

      updateTransform();
      updateVisibleTiles();
    },
    [updateTransform, updateVisibleTiles],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    rafRef.current = requestAnimationFrame(animate);
    // Resume auto-pan after momentum settles
    startAutoPan();
  }, [animate, startAutoPan]);

  // Initialize (no wheel handler — drag only)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Center the viewport on world origin (0, 0) where the exclusion zone is
    const { width, height } = container.getBoundingClientRect();
    offsetRef.current = { x: -width / 2, y: -height / 2 };

    // Generate focus positions for auto-pan
    focusPositionsRef.current = generateFocusPositions(
      16,
      tileSize,
      testimonials,
      cardsPerTile,
      centerExclusionWidth,
      centerExclusionHeight,
    );

    // Initial tile calculation - deferred to avoid synchronous setState in effect
    updateTransform();
    queueMicrotask(() => {
      updateVisibleTiles();
    });

    // Start auto-pan after initial delay
    const initialTimer = setTimeout(() => {
      startAutoPan();
    }, autoPanInterval);

    return () => {
      clearTimeout(initialTimer);
      stopAutoPan();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [
    updateVisibleTiles,
    updateTransform,
    tileSize,
    testimonials,
    cardsPerTile,
    centerExclusionWidth,
    centerExclusionHeight,
    autoPanInterval,
    startAutoPan,
    stopAutoPan,
  ]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => updateVisibleTiles();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateVisibleTiles]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate h-screen w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dot grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-size-[24px_24px] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)]" />

      {/* Scrollable content layer */}
      <div
        ref={contentRef}
        className="absolute will-change-transform"
        style={{ transform: "translate3d(0, 0, 0)" }}
      >
        {visibleTiles.map((tile) => (
          <div
            key={`${tile.tileX}-${tile.tileY}`}
            className="absolute"
            style={{
              left: tile.tileX * tileSize,
              top: tile.tileY * tileSize,
              width: tileSize,
              height: tileSize,
            }}
          >
            {tile.cards.map((card) => {
              const isActive = activeCardId === card.id;
              const hasActiveCard = activeCardId !== null;
              return (
                <motion.div
                  key={card.id}
                  className="absolute origin-center overflow-hidden rounded-xl bg-white p-5 shadow-lg ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10"
                  style={{
                    left: card.x,
                    top: card.y,
                    width: card.width,
                    rotate: card.rotation || 0,
                  }}
                  initial={false}
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    opacity: hasActiveCard ? (isActive ? 1 : 0.1) : 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  {/* Testimonial content */}
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <p className="text-base leading-snug font-semibold text-neutral-800 dark:text-neutral-100">
                        &ldquo;{card.testimonial.title}&rdquo;
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                        {card.testimonial.quote}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Image
                        width={50}
                        height={50}
                        src={card.testimonial.imageSrc}
                        alt={card.testimonial.name}
                        className="size-8 rounded-full object-cover"
                        loading="lazy"
                        draggable={false}
                      />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {card.testimonial.name}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Children overlay */}
      {children && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-auto size-full">{children}</div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LinesGradientShaderProps {
  /** CSS class name for the container (use Tailwind for background color) */
  className?: string;
  /** Animation speed multiplier (lower = slower) */
  speed?: number;
  /** Number of bands in the spiral */
  bandCount?: number;
  /** Spacing between band centers in pixels */
  bandSpacing?: number;
  /** Thickness of each band in pixels */
  bandThickness?: number;
  /** Wave amplitude as a fraction of container height (0-1) */
  waveAmplitude?: number;
  /** Custom color stops for the gradient. Accepts hex colors, rgb(), or CSS variables like "var(--brand)" */
  colors?: string[];
  /** Target frames per second (default: 30 for performance) */
  targetFps?: number;
  /** Disable highlight overlay lines for better performance */
  disableHighlights?: boolean;
}

/** Parse a color string (CSS variable, rgb, rgba, hex) into RGBA tuple */
const parseColorToRgba = (
  color: string,
  element: HTMLElement,
): [number, number, number, number] => {
  const computedStyle = getComputedStyle(element);

  // Resolve CSS variable if needed
  let resolvedColor = color;
  if (color.startsWith("var(")) {
    const varName = color.slice(4, -1).trim();
    resolvedColor = computedStyle.getPropertyValue(varName).trim();
  }

  // Try to parse as rgba (with alpha)
  const rgbaMatch = resolvedColor.match(
    /rgba\s*\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*[,/]\s*([\d.]+)\s*\)/,
  );
  if (rgbaMatch) {
    return [
      parseInt(rgbaMatch[1]),
      parseInt(rgbaMatch[2]),
      parseInt(rgbaMatch[3]),
      parseFloat(rgbaMatch[4]),
    ];
  }

  // Try to parse as rgb (no alpha, default to 1)
  const rgbMatch = resolvedColor.match(
    /rgb\s*\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*\)/,
  );
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1]),
      parseInt(rgbMatch[2]),
      parseInt(rgbMatch[3]),
      1,
    ];
  }

  // Try to parse as hex with alpha (#RRGGBBAA)
  const hexAlphaMatch = resolvedColor.match(
    /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i,
  );
  if (hexAlphaMatch) {
    return [
      parseInt(hexAlphaMatch[1], 16),
      parseInt(hexAlphaMatch[2], 16),
      parseInt(hexAlphaMatch[3], 16),
      parseInt(hexAlphaMatch[4], 16) / 255,
    ];
  }

  // Try to parse as hex (no alpha)
  const hexMatch = resolvedColor.match(
    /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i,
  );
  if (hexMatch) {
    return [
      parseInt(hexMatch[1], 16),
      parseInt(hexMatch[2], 16),
      parseInt(hexMatch[3], 16),
      1,
    ];
  }

  // Try short hex
  const shortHexMatch = resolvedColor.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
  if (shortHexMatch) {
    return [
      parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
      parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
      parseInt(shortHexMatch[3] + shortHexMatch[3], 16),
      1,
    ];
  }

  // Fallback: use a temporary element to compute the color
  const temp = document.createElement("div");
  temp.style.color = resolvedColor;
  temp.style.display = "none";
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  // Check for rgba in computed
  const fallbackRgbaMatch = computed.match(
    /rgba\s*\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*[,/]\s*([\d.]+)\s*\)/,
  );
  if (fallbackRgbaMatch) {
    return [
      parseInt(fallbackRgbaMatch[1]),
      parseInt(fallbackRgbaMatch[2]),
      parseInt(fallbackRgbaMatch[3]),
      parseFloat(fallbackRgbaMatch[4]),
    ];
  }

  const fallbackRgbMatch = computed.match(
    /rgb\s*\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*\)/,
  );
  if (fallbackRgbMatch) {
    return [
      parseInt(fallbackRgbMatch[1]),
      parseInt(fallbackRgbMatch[2]),
      parseInt(fallbackRgbMatch[3]),
      1,
    ];
  }

  // Ultimate fallback
  return [128, 128, 128, 1];
};

const DEFAULT_COLORS = [
  "var(--brand)",
  "var(--brand-strong)",
  "var(--brand)",
  "var(--brand-strong)",
  "var(--brand)",
  "var(--brand-strong)",
  "var(--brand)",
  "var(--brand-strong)",
];

export const LinesGradientShader: React.FC<LinesGradientShaderProps> = ({
  className,
  speed = 1,
  bandCount = 5,
  bandSpacing = 25,
  bandThickness = 60,
  waveAmplitude = 0.15,
  colors = DEFAULT_COLORS,
  targetFps = 30,
  disableHighlights = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  const prefersReducedMotionRef = useRef<boolean>(false);
  const [resolvedColors, setResolvedColors] = useState<
    [number, number, number, number][]
  >([]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mediaQuery.matches;

    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Resolve CSS variable colors to RGBA tuples
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resolved = colors.map((color) => parseColorToRgba(color, container));
    setResolvedColors(resolved);
  }, [colors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || resolvedColors.length === 0) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let stopped = false;
    // Cap DPR at 2 for performance on high-DPI displays
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const frameInterval = 1000 / targetFps;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${Math.floor(width)}px`;
      canvas.style.height = `${Math.floor(height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    // Intersection Observer - only animate when visible
    const io = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.01 },
    );
    io.observe(container);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        startTimeRef.current = 0;
        lastFrameTimeRef.current = 0;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Interpolate between two RGBA colors
    const interpolateColor = (
      color1: [number, number, number, number],
      color2: [number, number, number, number],
      t: number,
    ): string => {
      const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
      const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
      const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
      const a = color1[3] + (color2[3] - color1[3]) * t;
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
    };

    const colorStops = resolvedColors;

    const getColorAtPosition = (t: number): string => {
      const clampedT = Math.max(0, Math.min(1, t));
      const scaledT = clampedT * (colorStops.length - 1);
      const index = Math.floor(scaledT);
      const fraction = scaledT - index;

      const color1 = colorStops[Math.min(index, colorStops.length - 1)];
      const color2 = colorStops[Math.min(index + 1, colorStops.length - 1)];

      return interpolateColor(color1, color2, fraction);
    };

    // Reduced step count for better performance (40 vs 80)
    const steps = 40;

    const draw = (timestamp: number) => {
      if (stopped) return;

      // Skip frame if not visible or tab is hidden
      if (!isVisibleRef.current || document.hidden) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Frame rate throttling
      const deltaTime = timestamp - lastFrameTimeRef.current;
      if (deltaTime < frameInterval) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTimeRef.current = timestamp - (deltaTime % frameInterval);

      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      // If user prefers reduced motion, draw static frame only once
      const elapsed = prefersReducedMotionRef.current
        ? 0
        : (timestamp - startTimeRef.current) * 0.001 * speed;

      const { width, height } = container.getBoundingClientRect();

      // Clear canvas (transparent to show container background)
      ctx.clearRect(0, 0, width, height);

      // Configuration for tightly grouped spiral bands
      const baseAmplitude = height * waveAmplitude;

      // Pre-calculate common values
      const halfBandCount = bandCount / 2;
      const widthPlusMargin = width + 400;

      // Draw flowing gradient bands from back to front
      for (let i = bandCount - 1; i >= 0; i--) {
        const progress = i / (bandCount - 1);

        // Each band has a gradient from one color to the next
        const colorStart = getColorAtPosition(progress - 0.02);
        const colorEnd = getColorAtPosition(progress + 0.08);

        // Create gradient for this band
        const gradient = ctx.createLinearGradient(
          width * 0.3,
          0,
          width,
          height,
        );
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);

        ctx.fillStyle = gradient;
        ctx.beginPath();

        // Animation phases - very slow movement
        const phase1 = elapsed * 0.12 + i * 0.15;
        const phase2 = elapsed * 0.08 + i * 0.1;
        const phase3 = elapsed * 0.05 + i * 0.08;

        // Tight spacing - bands are very close together
        const bandOffset = (i - halfBandCount) * bandSpacing;

        // Start from bottom-left, off screen
        ctx.moveTo(-100, height + 200);

        // Draw the bottom edge of the band (going right)
        const bottomPoints: { x: number; y: number }[] = [];
        const topPoints: { x: number; y: number }[] = [];

        for (let j = 0; j <= steps; j++) {
          const t = j / steps;

          // X position goes from left to right with curve
          const x = -100 + widthPlusMargin * t;

          // Base Y follows a diagonal from bottom-left to top-right
          const baseY = height * 1.4 - t * height * 1.2 + bandOffset;

          // Add flowing wave motion - all bands move together as a group
          const wave1 = Math.sin(t * 2.5 + phase1) * baseAmplitude;
          const wave2 = Math.sin(t * 1.5 + phase2) * baseAmplitude * 0.4;
          const wave3 = Math.sin(t * 4 + phase3) * baseAmplitude * 0.15;

          const waveOffset = wave1 + wave2 + wave3;

          // Consistent thin band thickness
          const thickness = bandThickness + 4 * Math.sin(t * 2 + phase1 * 0.3);

          const bottomY = baseY + waveOffset + thickness / 2;
          const topY = baseY + waveOffset - thickness / 2;

          bottomPoints.push({ x, y: bottomY });
          topPoints.push({ x, y: topY });
        }

        // Draw bottom edge
        for (let k = 0; k < bottomPoints.length; k++) {
          ctx.lineTo(bottomPoints[k].x, bottomPoints[k].y);
        }

        // Draw to top-right corner area
        ctx.lineTo(width + 200, -100);

        // Draw top edge (going left)
        for (let k = topPoints.length - 1; k >= 0; k--) {
          ctx.lineTo(topPoints[k].x, topPoints[k].y);
        }

        // Close path
        ctx.lineTo(-100, height + 200);
        ctx.closePath();

        ctx.fill();
      }

      // Optional highlight lines (disabled by default for performance)
      if (!disableHighlights) {
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;

        for (let i = 0; i < bandCount; i++) {
          const phase1 = elapsed * 0.12 + i * 0.15;
          const phase2 = elapsed * 0.08 + i * 0.1;
          const phase3 = elapsed * 0.05 + i * 0.08;
          const bandOffset = (i - halfBandCount) * bandSpacing;

          ctx.beginPath();

          for (let j = 0; j <= 30; j++) {
            const t = j / 30;
            const x = -100 + widthPlusMargin * t;
            const baseY = height * 1.4 - t * height * 1.2 + bandOffset;

            const wave1 = Math.sin(t * 2.5 + phase1) * baseAmplitude;
            const wave2 = Math.sin(t * 1.5 + phase2) * baseAmplitude * 0.4;
            const wave3 = Math.sin(t * 4 + phase3) * baseAmplitude * 0.15;

            const y = baseY + wave1 + wave2 + wave3;

            if (j === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          ctx.stroke();
        }

        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }

      // For reduced motion, only draw once
      if (prefersReducedMotionRef.current) {
        return;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      ro.disconnect();
      io.disconnect();
    };
  }, [
    speed,
    bandCount,
    bandSpacing,
    bandThickness,
    waveAmplitude,
    resolvedColors,
    targetFps,
    disableHighlights,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none relative overflow-hidden mask-b-from-50%",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ display: "block" }}
      />
    </div>
  );
};

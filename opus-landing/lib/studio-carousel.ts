export function getStudioSlideOffset(
  index: number,
  activeIndex: number,
  slideCount: number,
) {
  const midpoint = Math.floor(slideCount / 2);
  const offset =
    ((index - activeIndex + slideCount + midpoint) % slideCount) - midpoint;

  // Keep the two neighboring cards on either side; park the rest offstage.
  return Math.max(-3, Math.min(3, offset));
}

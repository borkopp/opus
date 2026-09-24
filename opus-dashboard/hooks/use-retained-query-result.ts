"use client";
import { useState } from "react";

/** Keep a widget mounted while Convex changes query arguments or refreshes. */
export function useRetainedQueryResult<T>(value: T | undefined) {
  const [retained, setRetained] = useState(value);
  // Adjust only when a new resolved result arrives. Unlike an effect, this does
  // not commit an intermediate empty frame or reset child input/filter state.
  if (value !== undefined && value !== retained) setRetained(value);
  return value ?? retained;
}

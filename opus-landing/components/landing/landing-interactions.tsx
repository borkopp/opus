"use client";

import { useEffect } from "react";
import { initializeLanding } from "./interactions";

export function LandingInteractions() {
  useEffect(() => initializeLanding(), []);
  return null;
}

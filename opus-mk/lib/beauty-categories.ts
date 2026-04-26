import {
  IconScissors,
  IconBrush,
  IconHandSanitizer,
  IconLeaf,
  IconHeart,
  IconEye,
  IconUser,
  IconFlame,
  IconMassage,
  IconYoga,
  IconRun,
} from "@tabler/icons-react";
import React from "react";

export type BeautyCategory =
  | "barbershop" | "hair_salon" | "nail_salon" | "spa" | "beauty_salon"
  | "lash_studio" | "brow_bar" | "tattoo_studio" | "massage_therapy"
  | "wellness_center" | "personal_trainer";

export const CATEGORIES: { id: BeautyCategory; label: string; icon: React.ReactNode }[] = [
  { id: "barbershop",       label: "Barbershop",       icon: React.createElement(IconScissors, { size: 20 }) },
  { id: "hair_salon",       label: "Hair Salon",       icon: React.createElement(IconBrush, { size: 20 }) },
  { id: "nail_salon",       label: "Nail Salon",       icon: React.createElement(IconHandSanitizer, { size: 20 }) },
  { id: "spa",              label: "Spa",              icon: React.createElement(IconLeaf, { size: 20 }) },
  { id: "beauty_salon",     label: "Beauty Salon",     icon: React.createElement(IconHeart, { size: 20 }) },
  { id: "lash_studio",      label: "Lash Studio",      icon: React.createElement(IconEye, { size: 20 }) },
  { id: "brow_bar",         label: "Brow Bar",         icon: React.createElement(IconUser, { size: 20 }) },
  { id: "tattoo_studio",    label: "Tattoo Studio",    icon: React.createElement(IconFlame, { size: 20 }) },
  { id: "massage_therapy",  label: "Massage Therapy",  icon: React.createElement(IconMassage, { size: 20 }) },
  { id: "wellness_center",  label: "Wellness Center",  icon: React.createElement(IconYoga, { size: 20 }) },
  { id: "personal_trainer", label: "Personal Trainer", icon: React.createElement(IconRun, { size: 20 }) },
];

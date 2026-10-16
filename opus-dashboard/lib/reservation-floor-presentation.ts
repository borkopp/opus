import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

type Status = FunctionReturnType<
  typeof api.hospitality.getLiveTables
>["tables"][number]["status"];
export const floorStatusPresentation: Record<
  Status,
  { label: [string, string, string]; shape: string; dot: string }
> = {
  available: {
    label: ["Available", "Слободна", "E lirë"],
    shape: "fill-success/10 stroke-success",
    dot: "bg-success",
  },
  reserved: {
    label: ["Reserved", "Резервирана", "E rezervuar"],
    shape: "fill-primary/10 stroke-primary",
    dot: "bg-primary",
  },
  occupied: {
    label: ["Occupied", "Зафатена", "E zënë"],
    shape: "fill-primary/25 stroke-primary",
    dot: "bg-primary",
  },
  cleaning: {
    label: ["Reset needed", "За подготовка", "Për t’u përgatitur"],
    shape: "fill-highlight/25 stroke-foreground/50",
    dot: "bg-highlight",
  },
  inactive: {
    label: ["Inactive", "Неактивна", "Joaktive"],
    shape: "fill-muted stroke-muted-foreground/40",
    dot: "bg-muted-foreground",
  },
  closed: {
    label: ["Closed", "Затворена", "E mbyllur"],
    shape: "fill-muted stroke-muted-foreground/60",
    dot: "bg-muted-foreground",
  },
  needs_review: {
    label: ["Needs review", "Потребна е проверка", "Kërkon rishikim"],
    shape: "fill-danger/15 stroke-danger",
    dot: "bg-danger",
  },
};

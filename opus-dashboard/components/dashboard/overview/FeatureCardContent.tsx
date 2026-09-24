import { appearStep } from "@/lib/appear";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import s from "../clarity.module.css";

export function FeatureCardContent({
  status,
  description,
  href,
  actionLabel,
  external = false,
}: {
  status: ReactNode;
  description: string;
  href: string;
  actionLabel: string;
  external?: boolean;
}) {
  return (
    <div className="mt-5 flex flex-1 flex-col gap-4">
      {status != null && (
        <div
          data-appear="item"
          style={appearStep(3)}
          className="text-sm font-medium text-primary"
        >
          {status}
        </div>
      )}
      <p
        data-appear="item"
        style={appearStep(4)}
        className="text-sm leading-6 text-muted-foreground"
      >
        {description}
      </p>
      <Link
        data-appear="item"
        style={appearStep(5)}
        className={`${s.clientButton} mt-auto`}
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {actionLabel}
        <ArrowUpRight size={17} aria-hidden="true" />
      </Link>
    </div>
  );
}

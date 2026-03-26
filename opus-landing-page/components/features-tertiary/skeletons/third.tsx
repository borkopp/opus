import { ArrowIconReverse, ArrowIllustration } from "@/illustrations/grid";
import { cn } from "@/lib/utils";
import { IconSettings, IconSparkles } from "@tabler/icons-react";
import React from "react";

export const SkeletonThree = () => {
  return (
    <div className="flex-1 rounded-t-3xl gap-2 flex flex-col z-20 mx-auto w-full h-full absolute  inset-0 pt-2 px-2 perspective-[4000px] max-w-lg">
      <ArrowIllustration className="absolute left-40 -top-4 mx-auto z-30" />
      <ArrowIconReverse className="absolute left-32 -bottom-10 mx-auto blur-[2px]" />
      <div
        className={cn(
          "flex items-center justify-center gap-20 h-[200%]",
          "absolute -inset-x-[150%] -inset-y-40",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,var(--color-neutral-200)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-neutral-200)_1px,transparent_1px)]",
          "dark:[background-image:linear-gradient(to_right,var(--color-neutral-700)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-neutral-700)_1px,transparent_1px)]",
          "mask-radial-from-50% mask-t-from-50% mask-b-from-50%"
        )}
        style={{
          transform: "rotateY(20deg) rotateX(50deg) rotateZ(40deg)",
        }}
      >
        <div className="px-4 py-2 rounded-full bg-orange-100 border border-orange-300 text-orange-500 font-medium flex items-center gap-2">
          <IconSettings className="size-4" />
          <span>Processing</span>
        </div>
        <div className="px-4 py-2 rounded-full bg-green-100 border border-green-300 text-green-500 font-medium flex items-center gap-2">
          <IconSparkles className="size-4" />
          <span>Feedback</span>
        </div>
      </div>
    </div>
  );
};

import Image from "next/image";
import { Audiowide } from "next/font/google";

const audiowide = Audiowide({ weight: "400", subsets: ["latin"] });

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-2 text-primary" aria-label="OPUS">
        <Image src="/opus-mark.svg" width={40} height={40} alt="" aria-hidden="true" />
        <span className={`${audiowide.className} text-2xl uppercase leading-none tracking-wider`}>OPUS</span>
      </span>
      <span className="border-l pl-3 text-sm text-muted-foreground">
        Owner
      </span>
    </div>
  );
}

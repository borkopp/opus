import { IconArrowRight } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "./button";

export function CTA() {
  return (
    <section className="mx-auto my-20 w-full max-w-6xl px-4 md:px-8">
      <div className="relative overflow-hidden rounded-[40px] bg-neutral-900 p-8 text-center md:p-20">
        <div className="relative z-10">
          <h2 className="text-3xl font-medium tracking-tight text-white md:text-5xl">
            Подготвени сте за појасен{" "}
            <span className="font-playfair text-brand-primary italic">
              календар
            </span>
            ?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-300">
            Поставете ги услугите, тимот и работното време, па споделете го
            вашиот јавен линк за резервации.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="https://app.opus.mk">
              <Button className="h-14 rounded-full px-10 text-lg shadow-xl shadow-brand-primary/20">
                Отворете OPUS
                <IconArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute inset-0 z-0">
          <Image src="/bg.jpg" alt="" fill className="object-cover" />
        </div>
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-brand-primary/20 blur-[100px]" />
        <div className="absolute -right-24 -bottom-24 size-96 rounded-full bg-brand-primary/10 blur-[100px]" />
      </div>
    </section>
  );
}

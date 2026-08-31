import { IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";

import { Button } from "./button";

export function CTA() {
  return (
    <section className="mx-auto my-20 w-full max-w-6xl px-4 md:px-8">
      <div className="bg-foreground text-background relative overflow-hidden rounded-xl p-8 text-center md:p-20">
        <div className="relative z-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-5xl">
            Подготвени сте за појасен календар?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/75">
            Поставете ги услугите, тимот и работното време, па објавете ја
            вашата веб-страница за резервации.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="https://studio.opus.mk">
              <Button className="shadow-brand-primary/20 h-14 rounded-full px-10 text-lg shadow-xl">
                Отворете OPUS
                <IconArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-primary/20 absolute -top-24 -left-24 size-96 rounded-full blur-[100px]" />
        <div className="bg-primary/10 absolute -right-24 -bottom-24 size-96 rounded-full blur-[100px]" />
      </div>
    </section>
  );
}

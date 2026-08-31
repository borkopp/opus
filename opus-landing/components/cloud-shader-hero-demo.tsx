"use client";

import Image from "next/image";

import { CloudShader } from "@/components/ui/cloud-shader";

export default function CloudShaderHero() {
  return (
    <section className="bg-background relative min-h-[50rem] w-full overflow-hidden">
      <CloudShader className="absolute inset-0" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pt-28 text-center md:pt-36">
        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md md:text-6xl lg:text-7xl">
          Помалку празни термини. <br className="hidden md:block" /> Повеќе
          резервирани клиенти.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-white/90 drop-shadow-sm md:text-lg">
          OPUS им помага на малите студија за убавина да управуваат со термините
          и да ги претворат откажувањата и празните места во нови резервации.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="https://studio.opus.mk"
            className="text-primary rounded-full bg-white px-6 py-2.5 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            Отворете OPUS
          </a>
          <a
            href="#product"
            className="rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Погледнете ја платформата
          </a>
        </div>
        <p className="mt-4 text-xs text-white/70">
          Календар &middot; Услуги &middot; Тим &middot; Сопствена веб-страница
        </p>
      </div>

      <div className="relative z-10 mx-auto mt-12 w-full max-w-6xl px-4 pb-4 md:mt-16 md:px-8">
        <div className="rounded-2xl border border-white/30 bg-white/20 p-2 shadow-2xl backdrop-blur-md md:rounded-[2rem] md:p-3">
          <Image
            src="/hero.png"
            alt="OPUS календар за управување со термини во студио за убавина"
            width={3464}
            height={2092}
            priority
            sizes="(min-width: 1280px) 1152px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)"
            className="w-full rounded-xl border border-black/5 shadow-lg md:rounded-3xl"
          />
        </div>
      </div>
    </section>
  );
}

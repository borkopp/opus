import Link from "next/link";
import type {
  LegalBlock,
  LegalDocument as LegalDocumentContent,
} from "@/lib/legal";

function LegalTextLink({ href, label }: { href: string; label: string }) {
  const className =
    "font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-brand-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  const isExternal = href.startsWith("http");

  return (
    <a
      href={href}
      className={className}
      {...(isExternal ? { rel: "noreferrer", target: "_blank" } : {})}
    >
      {label}
    </a>
  );
}

function LegalBlockContent({ block }: { block: LegalBlock }) {
  if (block.type === "paragraph") {
    return <p>{block.text}</p>;
  }

  if (block.type === "list") {
    return (
      <ul className="marker:text-brand-primary flex list-disc flex-col gap-3 pl-5">
        {block.items.map((item) => (
          <li key={item} className="pl-2">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "link") {
    return (
      <p>
        {block.text} <LegalTextLink href={block.href} label={block.label} />.
      </p>
    );
  }

  return (
    <dl className="border-border bg-border grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2">
      {block.items.map((item) => (
        <div key={item.label} className="bg-background p-4 sm:p-5">
          <dt className="text-muted-foreground font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
            {item.label}
          </dt>
          <dd className="text-foreground mt-1.5 text-sm font-medium">
            {item.href ? (
              <LegalTextLink href={item.href} label={item.value} />
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function LegalTableOfContents({
  document,
}: {
  document: LegalDocumentContent;
}) {
  return (
    <nav aria-label={document.tocLabel}>
      <ol className="flex flex-col gap-1">
        {document.sections.map((section, index) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="group text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring grid grid-cols-[1.75rem_1fr] gap-2 rounded-lg px-2 py-2 text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="text-muted-foreground/70 group-hover:text-brand-primary font-mono text-[10px] leading-5">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{section.title.replace(/^\d+\.\s*/, "")}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function LegalDocument({
  document,
}: {
  document: LegalDocumentContent;
}) {
  return (
    <main className="bg-background text-foreground min-h-screen pt-24 sm:pt-28">
      <header className="border-border border-b">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20 lg:px-12 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-brand-primary font-mono text-xs font-medium tracking-[0.16em] uppercase">
              {document.eyebrow}
            </p>
            <h1 className="text-foreground mt-5 max-w-3xl text-4xl leading-[1.05] font-bold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              {document.title}
            </h1>
            <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8">
              {document.description}
            </p>
          </div>

          <div className="border-brand-primary self-end border-l-2 pl-5 sm:pl-6">
            <p className="text-foreground text-base leading-7 font-medium">
              {document.summary}
            </p>
            <dl className="border-border mt-6 grid grid-cols-2 gap-5 border-t pt-5">
              <div>
                <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                  {document.effectiveLabel}
                </dt>
                <dd className="text-foreground mt-1 text-sm">
                  {document.effectiveDate}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                  {document.lastUpdatedLabel}
                </dt>
                <dd className="text-foreground mt-1 text-sm">
                  {document.lastUpdatedDate}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[15rem_minmax(0,46rem)] lg:justify-between lg:gap-20">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <details className="group border-border overflow-hidden rounded-2xl border lg:hidden">
              <summary className="focus-visible:outline-ring flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2">
                <span className="text-muted-foreground font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
                  {document.tocLabel}
                </span>
                <span className="text-brand-primary font-mono text-[10px]">
                  {String(document.sections.length).padStart(2, "0")}
                </span>
              </summary>
              <div className="border-border border-t p-3">
                <LegalTableOfContents document={document} />
              </div>
            </details>

            <div className="hidden lg:block">
              <p className="text-muted-foreground font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
                {document.tocLabel}
              </p>
              <div className="mt-5">
                <LegalTableOfContents document={document} />
              </div>
            </div>
          </aside>

          <article className="min-w-0">
            <section className="border-border border-b pb-12">
              <h2 className="text-foreground text-xl font-bold tracking-[-0.02em]">
                {document.summary}
              </h2>
              <ul className="mt-6 flex flex-col gap-4">
                {document.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="text-muted-foreground grid grid-cols-[0.55rem_1fr] gap-3 text-sm leading-6 sm:text-base sm:leading-7"
                  >
                    <span
                      className="bg-brand-primary mt-[0.65rem] size-1.5 rounded-full"
                      aria-hidden="true"
                    />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>

            {document.sections.map((section, index) => (
              <section
                id={section.id}
                key={section.id}
                className="border-border scroll-mt-28 border-b py-12 last:border-b-0 sm:py-14"
              >
                <div className="grid gap-4 sm:grid-cols-[2.5rem_1fr] sm:gap-5">
                  <span className="text-brand-primary font-mono text-xs leading-8">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="text-foreground text-2xl leading-8 font-bold tracking-[-0.025em] sm:text-3xl">
                      {section.title.replace(/^\d+\.\s*/, "")}
                    </h2>
                    <div className="text-muted-foreground mt-6 flex flex-col gap-5 text-[15px] leading-7 sm:text-base sm:leading-8">
                      {section.blocks.map((block, blockIndex) => (
                        <LegalBlockContent
                          key={`${section.id}-${blockIndex}`}
                          block={block}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </main>
  );
}

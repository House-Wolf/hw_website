import { JSX } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { SafeImage } from "@/components/utils/SafeImage";

/** House Wolf's origins, from Kampos to the legacy carried by the pack. */
export default function OriginsPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-background-elevated">
      <PageHeader
        title="Our Origins"
        subtitle="The legendary history of the Kamposian Dragoons"
        iconSrc="/images/global/HWiconnew.png"
      />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <section aria-labelledby="kampos-heading" className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
          <figure className="order-2 mx-auto w-full max-w-[320px] overflow-hidden rounded-xl border border-white/10 bg-background-base lg:order-1">
            <SafeImage
              src="/images/origins/kamposimagnusskull.png"
              alt="A skull on display, representing the history of Kampos"
              width={488}
              height={706}
              sizes="(max-width: 359px) calc(100vw - 40px), 320px"
              className="h-auto w-full"
            />
            <figcaption className="border-t border-white/10 px-4 py-3 text-xs text-foreground-muted">
              Kampos (Ellis IV) <span aria-hidden="true">·</span> Birthplace of the Dragoons
            </figcaption>
          </figure>

          <div className="order-1 lg:order-2">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground-muted">01 / Our beginnings</p>
            <h2 id="kampos-heading" className="mb-5 text-3xl font-bold text-white sm:text-4xl">Forged on Kampos</h2>
            <p className="mb-4 text-lg leading-relaxed text-foreground">
              The <strong className="font-semibold text-white">Kamposian Dragoons</strong> were a clan-based culture composed of multiple species, bound by a common creed, language, and code.
            </p>
            <p className="mb-4 text-base leading-relaxed text-foreground-muted">
              Originating on <strong className="font-medium text-foreground">Kampos (Ellis IV)</strong>, the Dragoons built a warrior culture founded on honor and strength. This unforgiving world forged them into a disciplined, legendary fighting force feared across the sector.
            </p>
            <p className="text-base leading-relaxed text-foreground-muted">
              Known as elite mercenaries and bounty hunters, the Dragoons shaped the galaxy through war, honor, and conquest.
            </p>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-3">
              <a
                href="https://robertsspaceindustries.com/galactapedia/article/RAXxrxr7M5-kampos-ellis-iv"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60 focus-visible:outline-white"
                aria-label="Explore Kampos in Galactapedia (opens in a new tab)"
              >
                Explore Galactapedia <ExternalLink size={14} aria-hidden="true" />
              </a>
              <a
                href="https://robertsspaceindustries.com/en/starmap?location=ELLIS.PLANETS.ELLISIVKAMPOS"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60 focus-visible:outline-white"
                aria-label="Find Kampos on the Star Map (opens in a new tab)"
              >
                View Star Map <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section aria-labelledby="expansion-heading" className="mt-10 border-t border-white/10 pt-10 sm:mt-12 sm:pt-12">
          <header className="mb-6">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground-muted">02 / Beyond the home world</p>
            <h2 id="expansion-heading" className="text-3xl font-bold text-white sm:text-4xl">The Great Expansion</h2>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <article className="overflow-hidden rounded-xl border border-white/10 bg-background-base">
              <SafeImage
                src="/images/origins/wars.png"
                alt="A burning city beneath a dark sky"
                width={1536}
                height={1024}
                sizes="(min-width: 1152px) 532px, (min-width: 768px) calc(50vw - 44px), calc(100vw - 40px)"
                className="h-auto w-full"
              />
              <div className="p-5 sm:p-6">
                <h3 className="mb-3 text-xl font-semibold text-white">Wars of Expansion</h3>
                <p className="text-base leading-relaxed text-foreground-muted">
                  The Dragoons expanded aggressively, conquering neighboring systems and establishing their dominance.
                </p>
              </div>
            </article>

            <article className="overflow-hidden rounded-xl border border-white/10 bg-background-base">
              <SafeImage
                src="/images/origins/dragoonSpace.png"
                alt="A planet surrounded by an orange nebula"
                width={1536}
                height={1024}
                sizes="(min-width: 1152px) 532px, (min-width: 768px) calc(50vw - 44px), calc(100vw - 40px)"
                className="h-auto w-full"
              />
              <div className="p-5 sm:p-6">
                <h3 className="mb-3 text-xl font-semibold text-white">Dragoon Space</h3>
                <p className="text-base leading-relaxed text-foreground-muted">
                  The surrounding sector became known as <strong className="font-medium text-foreground">Dragoon Space</strong>, signifying unstoppable military dominance.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section aria-labelledby="legacy-heading" className="mt-10 flex flex-col gap-6 rounded-xl border border-white/10 bg-background-base p-6 sm:mt-12 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-xl">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground-muted">03 / The pack today</p>
            <h2 id="legacy-heading" className="mb-3 text-2xl font-bold text-white sm:text-3xl">Our legacy continues</h2>
            <p className="text-base leading-relaxed text-foreground-muted">
              House Wolf carries the Dragoon legacy forward—honoring tradition while forging a new path among the stars.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/code" className="inline-flex min-h-11 items-center justify-between gap-5 rounded-md border border-white/15 bg-crimson px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-crimson-light focus-visible:outline-white">
              The Dragoon Code <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/leadership" className="inline-flex min-h-11 items-center justify-between gap-5 rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 focus-visible:outline-white">
              Meet our leadership <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

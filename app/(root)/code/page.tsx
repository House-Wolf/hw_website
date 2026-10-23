import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { SafeImage } from "@/components/utils/SafeImage";

const pillars = [
  {
    title: "Strength",
    creed: "Strength is life,",
    meaning: "for the strong have the right to rule",
    image: "/images/code/strength.png",
    width: 200,
    height: 300,
    paragraphs: [
      "The right to rule belongs to the strong. Those who possess superior strength have earned the authority to lead and shape the destiny of others.",
      "When Dragoons encounter those weaker, they have the right—and duty—to bring them into the fold, sharing the Dragoon way of life through conquest and integration.",
    ],
  },
  {
    title: "Honor",
    creed: "Honor is life,",
    meaning: "for with no honor one may as well be dead",
    image: "/images/code/honor.png",
    width: 1024,
    height: 1536,
    paragraphs: [
      "Honor defines existence itself. A life without honor is no life at all—merely an empty shell devoid of meaning or purpose.",
      "Every action, every decision, every battle must be conducted with unwavering honor. It is the soul of the Dragoon warrior and the measure by which all are judged.",
    ],
  },
  {
    title: "Death",
    creed: "Death is life,",
    meaning: "one should die as they have lived",
    image: "/images/code/death.png",
    width: 1024,
    height: 1536,
    paragraphs: [
      "Death is not the end, but the ultimate expression of how one has lived. The manner of death matters far more than death itself.",
      "A Dragoon who dies with strength and honor achieves an acceptable death—one that upholds the Code and serves as an example for all who remain.",
    ],
  },
] as const;

const principles = [
  {
    title: "Raise Children as Dragoons",
    description: "Pass down the warrior culture, traditions, and values to the next generation, ensuring the eternal continuation of the Dragoon way of life.",
  },
  {
    title: "Wear the Dragoon Armor",
    description: "Don the sacred armor that symbolizes our identity and heritage. The armor is more than protection—it is a statement of who we are.",
  },
  {
    title: "Master Self-Defense",
    description: "Continuously hone combat skills and tactical prowess. A Dragoon must be capable of defending themselves and their clan at all times.",
  },
  {
    title: "Devote Yourself to the Clan",
    description: "Put the welfare of House Wolf above personal gain. The clan's prosperity and survival depend on each member's unwavering dedication.",
  },
  {
    title: "Speak the Dragoon Language",
    description: "Preserve and use the sacred tongue that binds all Dragoons together, maintaining our unique identity and cultural heritage.",
  },
  {
    title: "Answer the Call",
    description: "When House Wolf summons, every Dragoon must answer. Loyalty and response to the clan's needs are fundamental to our survival and strength.",
  },
] as const;

/** The Dragoon creed, its three pillars, and the six principles of the Resol'nare. */
export default function DragoonCodePage() {
  return (
    <main className="min-h-screen bg-background-elevated">
      <PageHeader
        title="The Dragoon Code"
        subtitle="A warrior culture centered on armor, weapons, and war"
        iconSrc="/images/global/HWiconnew.png"
      />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <nav aria-label="Dragoon Code sections" className="mb-8 flex flex-wrap gap-x-6 gap-y-1 border-b border-white/10 pb-4 text-sm text-foreground-muted">
          <a href="#creed" className="inline-flex min-h-11 items-center underline decoration-transparent underline-offset-4 transition-colors hover:text-white hover:decoration-white/50 focus-visible:outline-white">The creed</a>
          <a href="#three-pillars" className="inline-flex min-h-11 items-center underline decoration-transparent underline-offset-4 transition-colors hover:text-white hover:decoration-white/50 focus-visible:outline-white">The Three Pillars</a>
          <a href="#resolnare" className="inline-flex min-h-11 items-center underline decoration-transparent underline-offset-4 transition-colors hover:text-white hover:decoration-white/50 focus-visible:outline-white">The six principles</a>
        </nav>

        <section id="creed" aria-labelledby="creed-heading" className="scroll-mt-44">
          <header className="mb-6">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground-muted">01 / The creed</p>
            <h2 id="creed-heading" className="text-3xl font-bold text-white sm:text-4xl">Code of Honor</h2>
          </header>
          <blockquote className="grid overflow-hidden rounded-xl border border-white/15 bg-background-base divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="p-6 sm:p-8">
                <p className="mb-2 text-xl font-semibold text-white">{pillar.creed}</p>
                <p className="text-base italic leading-relaxed text-foreground-muted">{pillar.meaning}</p>
              </div>
            ))}
          </blockquote>
        </section>

        <section id="three-pillars" aria-labelledby="pillars-heading" className="mt-10 scroll-mt-44 sm:mt-12">
          <header className="mb-6">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground-muted">02 / What we stand for</p>
            <h2 id="pillars-heading" className="text-3xl font-bold text-white sm:text-4xl">The Three Pillars</h2>
          </header>
          <div className="grid gap-6 lg:grid-cols-3">
            {pillars.map((pillar, index) => (
              <article key={pillar.title} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-background-base">
                <div className="border-b border-white/10 bg-white/[0.025] px-6 py-5">
                  <SafeImage
                    src={pillar.image}
                    alt={`${pillar.title} crest of the Dragoon Code`}
                    width={pillar.width}
                    height={pillar.height}
                    sizes="200px"
                    className="mx-auto h-auto w-full max-w-[200px]"
                  />
                </div>
                <div className="p-6">
                  <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.18em] text-foreground-muted">Pillar 0{index + 1}</p>
                  <h3 className="mb-4 text-2xl font-semibold text-white">{pillar.title}</h3>
                  <div className="space-y-4 text-sm leading-relaxed text-foreground-muted">
                    {pillar.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="resolnare" aria-labelledby="principles-heading" className="mt-10 scroll-mt-44 border-t border-white/10 pt-10 sm:mt-12 sm:pt-12">
          <header className="mb-6 max-w-2xl">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground-muted">03 / How we live</p>
            <h2 id="principles-heading" className="mb-3 text-3xl font-bold text-white sm:text-4xl">The Resol&apos;nare</h2>
            <p className="text-base leading-relaxed text-foreground-muted">Six Sacred Principles That Define A Dragoon</p>
          </header>
          <ol role="list" className="grid gap-4 md:grid-cols-2">
            {principles.map((principle, index) => (
              <li key={principle.title} className="flex gap-4 rounded-xl border border-white/10 bg-background-base p-5 sm:p-6">
                <span aria-hidden="true" className="shrink-0 border-r border-white/15 pr-4 pt-0.5 text-lg font-mono text-white/60">0{index + 1}</span>
                <div className="min-w-0">
                  <h3 className="mb-2 text-lg font-semibold leading-snug text-white">{principle.title}</h3>
                  <p className="text-sm leading-relaxed text-foreground-muted">{principle.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="join-house-wolf" aria-labelledby="join-heading" className="mt-10 scroll-mt-44 rounded-xl border border-white/15 bg-background-base p-6 sm:mt-12 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="max-w-xl">
              <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground-muted">Carry the Code forward</p>
              <h2 id="join-heading" className="mb-4 text-2xl font-bold text-white sm:text-3xl">Walk the Path of the Dragoon</h2>
              <p className="text-base leading-relaxed text-foreground-muted">These principles are not mere words—they are the foundation of our existence, the pillars upon which House Wolf stands. Live by the Code. Die by the Code.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
              <a href="https://robertsspaceindustries.com/en/orgs/CUTTERWOLF" target="_blank" rel="noopener noreferrer"
                aria-label="Join Our Ranks on RSI (opens in a new tab)"
                className="inline-flex min-h-11 items-center justify-between gap-5 rounded-md border border-white/15 bg-crimson px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-crimson-light focus-visible:outline-white">
                Join Our Ranks <ExternalLink size={16} aria-hidden="true" />
              </a>
              <Link href="/origins" className="inline-flex min-h-11 items-center justify-between gap-5 rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 focus-visible:outline-white">
                Learn Our History <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

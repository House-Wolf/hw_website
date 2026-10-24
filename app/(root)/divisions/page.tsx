import Link from "next/link";
import { SafeImage } from "@/components/utils/SafeImage";
import { ArrowRight } from "lucide-react";
import { DIVISIONS, type DivisionSlug } from "@/lib/divisions/divisionConfig";

const divisionHighlights: Record<DivisionSlug, { summary: string; specialties: string[] }> = {
  arcops: {
    summary: "Explore uncharted systems and turn research, field data, and advanced crafting into capabilities that empower every command.",
    specialties: ["Exploration", "Science & research", "Advanced crafting"],
  },
  locops: {
    summary: "Fuel every campaign through mining, engineering, trade, salvage, and heavy-lift logistics.",
    specialties: ["Industry & repair", "Trade & salvage", "Heavy lift"],
  },
  specops: {
    summary: "Deploy special forces, combat medics, and reconnaissance teams for covert strikes and critical extractions.",
    specialties: ["Special forces", "Combat medics", "Reconnaissance"],
  },
  tacops: {
    summary: "Deliver decisive firepower from atmosphere to vacuum with coordinated fighter wings, support wings, and heavy bombers.",
    specialties: ["Fighter wings", "Support wings", "Heavy bombers"],
  },
};

export const metadata = {
  title: "Divisions | House Wolf Dragoons",
  description:
    "Explore the elite divisions of House Wolf — ARCOPS, LOCOPS, SPECOPS, and TACOPS.",
  alternates: {
    canonical: "https://www.housewolf.co/divisions",
  },
};

/**
 * Divisions Landing Page
 * IMPORTANT:
 * - This page ONLY renders the divisions overview
 * - It MUST NOT import or render `/[slug]/page.tsx`
 */
export default function DivisionsPage() {
  return (
    <main className="min-h-screen bg-background-elevated">
      {/* ===================== */}
      {/* HERO SECTION */}
      {/* ===================== */}
      {/* Match the artwork's native ratio on screens where the image is shown. */}
      <section className="relative h-[95vh] min-h-[600px] flex items-center justify-center overflow-hidden 2xl:aspect-[2987/1256] 2xl:h-auto 2xl:min-h-0">
        {/* Background imagery (large screens only) */}
        <div className="absolute inset-0 z-0 hidden 2xl:block">
          <SafeImage
            src="/images/divisions/HWdivisionsandunits.png"
            alt="House Wolf Divisions"
            fill
            sizes="100vw"
            className="object-contain object-top"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-linear-to-r from-transparent via-black/40 to-transparent" />
          <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-background-elevated/70" />
        </div>

        {/* Divider */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-steel-light to-transparent opacity-50 z-10 shadow-[0_0_10px_rgba(17,78,98,0.6)]" />

        {/* Hero content */}
        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto">
          <SafeImage
            src="/images/global/HWiconnew.png"
            alt="House Wolf Icon"
            width={120}
            height={120}
            className="mx-auto drop-shadow-[0_0_30px_rgba(17,78,98,0.8)]"
          />
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-wider uppercase font-mono drop-shadow-lg">
            Our Divisions
          </h1>
          <p className="text-xl md:text-2xl text-white/90 italic drop-shadow-lg">
            Elite units forged in honor, bound by the Dragoon Code
          </p>
        </div>
      </section>

      {/* ===================== */}
      {/* DIVISIONS GRID */}
      {/* ===================== */}
      <section aria-labelledby="division-guide-heading" className="bg-background-elevated px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 max-w-2xl">
            <p className="mb-2 text-xs font-mono uppercase tracking-[0.2em] text-foreground-muted">House Wolf commands</p>
            <h2 id="division-guide-heading" className="mb-3 text-3xl font-bold text-white sm:text-4xl">Find your command</h2>
            <p className="text-base leading-relaxed text-foreground-muted">Discover where your skills fit within the pack. Each command brings a different strength to the mission.</p>
          </header>
          <div className="grid gap-6 xl:grid-cols-2">
            {Object.values(DIVISIONS).map((division) => (
              <Link
                key={division.slug}
                href={`/divisions/${division.slug}`}
                className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-background-base transition-colors hover:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:flex-row"
              >
                {/* Patch */}
                <div className="relative h-56 shrink-0 border-b border-white/10 bg-white/[0.025] sm:h-auto sm:w-44 sm:border-b-0 sm:border-r">
                  <div className="relative mx-auto h-56 w-40 sm:absolute sm:inset-5 sm:h-auto sm:w-auto">
                    <SafeImage src={division.patchImagePath} alt={division.patchAlt} fill sizes="160px" className="object-contain brightness-110" />
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-7">
                  <h3 className="mb-2 text-2xl font-bold tracking-wider text-white">{division.name}</h3>
                  <p className="mb-4 text-sm font-medium leading-relaxed text-foreground">{division.navDescription}</p>
                  <p className="mb-5 text-sm leading-relaxed text-foreground-muted">{divisionHighlights[division.slug].summary}</p>
                  <ul aria-label={`${division.name} specialties`} className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground-muted">
                    {divisionHighlights[division.slug].specialties.map((specialty) => (
                      <li key={specialty} className="flex items-center gap-2"><span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/40" />{specialty}</li>
                    ))}
                  </ul>
                  <div className="mt-auto flex min-h-11 items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm font-semibold text-white">
                    <span>Explore {division.name}</span>
                    <ArrowRight size={18} aria-hidden="true" className="transition-transform motion-safe:group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

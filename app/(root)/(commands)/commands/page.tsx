import Link from "next/link";
import { SafeImage } from "@/components/utils/SafeImage";
import { ArrowRight } from "lucide-react";
import { JSX } from "react";

/**
 * @component DivisionConfig
 * @description Static configuration describing House Wolf divisions.
 *              Hoisted to module scope for performance.
 */
const DIVISIONS = [
  {
    name: "ARCCOPS",
    slug: "ARCCOPS",
    patch: "/images/divisions/arccops/arccops.png",
    tagline: "Advanced Research & Cartography Operations Division",
    description:
      "The eyes and ears of House Wolf. ARCCOPS charts unknown territories, gathers critical intelligence, and provides reconnaissance support for all operations. When the unknown beckons, ARCCOPS answers.",
    color: "steel",
  },
  {
    name: "LOCOPS",
    slug: "LOCOPS",
    patch: "/images/divisions/locops/locops.png",
    tagline: "Logistics and Command Operations Command",
    description:
      "The backbone of House Wolf. LOCOPS ensures the flow of resources, manages mining operations, and coordinates salvage recovery across all theaters. Without logistics, there is no war.",
    color: "steel",
  },
  {
    name: "SPECOPS",
    slug: "SPECOPS",
    patch: "/images/divisions/specops/specops.png",
    tagline: "Special Operations Command",
    description:
      "The elite specialists of House Wolf. SPECOPS executes high-risk missions, provides critical medical support, and operates in the shadows where conventional forces cannot tread.",
    color: "crimson",
  },
  {
    name: "TACOPS",
    slug: "TACOPS",
    patch: "/images/divisions/tacops/tacops.png",
    tagline: "Tactical Air Control Operations Command",
    description:
      "The frontline warriors of House Wolf. TACOPS executes combat missions and tactical engagements with precision and overwhelming force. Where the battle rages, TACOPS leads the charge.",
    color: "crimson",
  },
] as const;

/**
 * @component DivisionsPage
 * @description Displays the House Wolf divisional structure, including
 *              hero presentation, division overview cards, and calls to action.
 *              This component is intentionally a Server Component.
 * @returns {JSX.Element} Divisions landing page
 * @author House Wolf Dev Team
 */
export default function DivisionsPage(): JSX.Element {
  return (
    // NEW: Semantic main landmark
    <main className="min-h-screen bg-linear-to-b from-shadow via-obsidian to-night-deep">
      {/* Hero Section */}
      <section className="relative h-[95vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 hidden 2xl:block">
          <SafeImage
            src="/images/divisions/HWdivisionsandunits.png"
            alt="House Wolf Divisions"
            fill
            className="object-center opacity-50"
          />
          <div className="absolute inset-0 bg-linear-to-b from-obsidian/80 via-obsidian/60 to-obsidian/95" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crimson/20 rounded-full blur-[120px] animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-steel/20 rounded-full blur-[120px] animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-steel-light to-transparent opacity-50 z-10 shadow-[0_0_10px_rgba(17,78,98,0.6)]" />

        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto">
          <SafeImage
            src="/images/global/HWiconnew.png"
            alt="House Wolf Icon"
            width={120}
            height={120}
            className="mx-auto drop-shadow-[0_0_30px_rgba(17,78,98,0.8)]"
          />
          <h1 className="text-5xl md:text-7xl font-bold text-steel-light mb-6 tracking-wider uppercase font-mono">
            Our Divisions
          </h1>
          <p className="text-xl md:text-2xl text-foreground-muted italic">
            Elite units forged in honor, bound by the Dragoon Code
          </p>
        </div>
      </section>

      {/* Divisions Grid */}
      <section className="py-20 px-4 bg-linear-to-b from-night-midnight to-obsidian">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {DIVISIONS.map((division) => (
            <Link
              key={division.slug}
              href={`/commands/${division.slug}`}
              className="group bg-linear-to-br from-steel-dark/20 to-obsidian border-2 border-steel/30 rounded-lg p-8 hover:scale-105 transition-all duration-500"
            >
              <div className="relative mb-6 flex justify-center">
                <div className="absolute inset-0 bg-steel/20 blur-2xl group-hover:blur-3xl transition-all" />
                <SafeImage
                  src={division.patch}
                  alt={`${division.name} Patch`}
                  width={150}
                  height={150}
                  className="relative drop-shadow-2xl group-hover:scale-110 transition-transform"
                />
              </div>

              <h3 className="text-2xl font-bold uppercase tracking-wider text-steel-light group-hover:text-foreground">
                {division.name}
              </h3>
              <p className="text-sm text-foreground-muted uppercase tracking-widest font-mono">
                {division.tagline}
              </p>
              <p className="text-foreground-muted leading-relaxed mt-4 mb-6">
                {division.description}
              </p>

              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-steel-light group-hover:text-foreground">
                <span>View Division</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

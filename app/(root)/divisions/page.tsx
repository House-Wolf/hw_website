import Link from "next/link";
import { SafeImage } from "@/components/utils/SafeImage";
import { ArrowRight } from "lucide-react";
import { DIVISIONS } from "@/lib/divisions/divisionConfig";

export const metadata = {
  title: "Divisions | House Wolf Dragoons",
  description:
    "Explore the elite divisions of House Wolf — ARCOPS, LOCOPS, SPECOPS, and TACOPS.",
  alternates: {
    canonical: "https://housewolf.co/divisions",
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
    <main className="min-h-screen bg-linear-to-b from-shadow via-obsidian to-night-deep">
      {/* ===================== */}
      {/* HERO SECTION */}
      {/* ===================== */}
      <section className="relative h-[95vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background imagery (large screens only) */}
        <div className="absolute inset-0 z-0 hidden 2xl:block">
          <SafeImage
            src="/images/divisions/HWdivisionsandunits.png"
            alt="House Wolf Divisions"
            fill
            className="object-center opacity-90"
          />
          <div className="absolute inset-0 bg-linear-to-b from-obsidian/80 via-obsidian/60 to-obsidian/95" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crimson/20 rounded-full blur-[120px] animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-steel/20 rounded-full blur-[120px] animate-pulse"
            style={{ animationDelay: "1s" }}
          />
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
          <h1 className="text-5xl md:text-7xl font-bold text-steel-light mb-6 tracking-wider uppercase font-mono">
            Our Divisions
          </h1>
          <p className="text-xl md:text-2xl text-foreground-muted italic">
            Elite units forged in honor, bound by the Dragoon Code
          </p>
        </div>
      </section>

      {/* ===================== */}
      {/* DIVISIONS GRID */}
      {/* ===================== */}
      <section className="py-20 px-4 bg-linear-to-b from-night-midnight to-obsidian">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.values(DIVISIONS).map((division) => (
            <Link
              key={division.slug}
              href={`/divisions/${division.slug}`}
              className="group bg-linear-to-br from-steel-dark/20 to-obsidian border-2 border-steel/30 rounded-lg p-8 hover:scale-105 transition-all duration-500"
            >
              {/* Patch */}
              <div className="relative mb-6 flex justify-center">
                <div className="absolute inset-0 bg-steel/20 blur-2xl group-hover:blur-3xl transition-all" />
                <SafeImage
                  src={division.patchImagePath}
                  alt={division.patchAlt}
                  width={150}
                  height={150}
                  className="relative drop-shadow-2xl group-hover:scale-110 transition-transform"
                />
              </div>

              {/* Text */}
              <h3 className="text-2xl font-bold uppercase tracking-wider text-steel-light group-hover:text-foreground">
                {division.name}
              </h3>

              <p className="text-sm text-foreground-muted uppercase tracking-widest font-mono">
                {division.navDescription}
              </p>

              <p className="text-foreground-muted leading-relaxed mt-4 mb-6">
                {division.description}
              </p>

              {/* CTA */}
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

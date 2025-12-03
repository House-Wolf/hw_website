"use client";

import Link from "next/link";
import { SafeImage } from "@/components/utils/SafeImage";
import { ArrowRight } from "lucide-react";

export default function DivisionsPage() {
  const divisions = [
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
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-shadow via-obsidian to-night-deep">
      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <SafeImage
            src="/images/divisions/HWdivisionsandunits.png"
            alt="House Wolf Divisions"
            fill
            className="object-center opacity-50"
          />
          <div className="absolute inset-0 bg-linear-to-b from-obsidian/80 via-obsidian/60 to-obsidian/95" />
          {/* Subtle color orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crimson/20 rounded-full blur-[120px] animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-steel/20 rounded-full blur-[120px] animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>
        {/* Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-steel-light to-transparent opacity-50 z-10 shadow-[0_0_10px_rgba(17,78,98,0.6)]" />
        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto">
          <div className="mb-8">
            <SafeImage
              src="/images/global/HWiconnew.png"
              alt="House Wolf Icon"
              width={120}
              height={120}
              className="mx-auto filter drop-shadow-[0_0_30px_rgba(17,78,98,0.8)]"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-steel-light mb-6 tracking-wider uppercase font-mono drop-shadow-[0_0_20px_rgba(17,78,98,0.8)]">
            Our Divisions
          </h1>
          <div className="h-1 w-32 bg-linear-to-r from-transparent via-steel-light to-transparent mx-auto mb-8 shadow-[0_0_15px_rgba(17,78,98,0.8)]" />
          <p className="text-xl md:text-2xl text-foreground-muted italic leading-relaxed">
            Elite units forged in honor, bound by the Wolf Code
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="relative py-20 px-4 bg-linear-to-b from-obsidian to-night-midnight overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-[radial-linear(ellipse_at_center,var(--tw-linear-stops))] from-steel/10 via-transparent to-transparent opacity-30" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="bg-linear-to-br from-steel-dark/20 via-crimson-dark/10 to-obsidian border-2 border-steel/30 rounded-lg p-8 md:p-12 shadow-[0_0_50px_rgba(17,78,98,0.4)] hover:shadow-[0_0_60px_rgba(17,78,98,0.5)] hover:border-steel/50 transition-all duration-500">
            <p className="text-xl md:text-2xl text-foreground leading-relaxed mb-6">
              House Wolf operates as a <span className="text-steel-light font-bold">multi-divisional force</span>,
              with each unit specializing in specific operational domains while maintaining our core values of
              <span className="text-crimson-light font-bold"> Honor, Strength, and Death Before Dishonor</span>.
            </p>
            <p className="text-lg md:text-xl text-foreground-muted leading-relaxed">
              From reconnaissance to logistics, from special operations to frontline combat—every Wolf
              serves with distinction, knowing that the pack is only as strong as its weakest member.
              Together, we are unstoppable.
            </p>
          </div>
        </div>
      </section>

      {/* Divisions Grid */}
      <section className="py-20 px-4 bg-linear-to-b from-night-midnight to-obsidian">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 uppercase tracking-wider">
              Our Units
            </h2>
            <div className="h-1 w-32 bg-linear-to-r from-transparent via-crimson to-transparent mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {divisions.map((division, index) => (
              <Link
                key={division.slug}
                href={`/commands/${division.slug}`}
                className={`group bg-linear-to-br ${
                  division.color = "from-steel-dark/20 to-obsidian border-steel/30 hover:border-steel-light hover:shadow-[0_0_50px_rgba(17,78,98,0.5)]"
                } border-2 rounded-lg p-8 hover:scale-105 transition-all duration-500`}
              >
                {/* Patch Image */}
                <div className="relative mb-6 flex justify-center">
                  <div className="relative">
                    <div
                      className={`absolute inset-0 ${
                        division.color === "crimson" ? "bg-crimson/20" : "bg-steel/20"
                      } blur-2xl group-hover:blur-3xl transition-all`}
                    />
                    <SafeImage
                      src={division.patch}
                      alt={`${division.name} Patch`}
                      width={150}
                      height={150}
                      className="relative drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>

                {/* Division Info */}
                <h3
                  className={`text-2xl font-bold mb-2 uppercase tracking-wider ${
                    division.color === "crimson" ? "text-crimson-light" : "text-steel-light"
                  } group-hover:text-foreground transition-colors`}
                >
                  {division.name}
                </h3>
                <p className="text-sm text-foreground-muted mb-4 font-mono uppercase tracking-widest">
                  {division.tagline}
                </p>
                <p className="text-foreground-muted leading-relaxed mb-6">{division.description}</p>

                {/* CTA */}
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-steel-light group-hover:text-foreground transition-colors">
                  <span>View Division</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative py-20 px-4 bg-linear-to-b from-obsidian to-shadow overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="bg-linear-to-br from-crimson-dark/30 via-steel-dark/20 to-obsidian border-2 border-crimson/50 rounded-lg p-12 md:p-16 shadow-[0_0_70px_rgba(71,0,0,0.4)] hover:shadow-[0_0_80px_rgba(71,0,0,0.5)] transition-all duration-500">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 uppercase tracking-wider">
              Join the Pack
            </h2>
            <p className="text-lg md:text-xl text-foreground-muted leading-relaxed mb-8">
              House Wolf seeks warriors of honor and skill. If you have what it takes to run with
              the pack, your place awaits in one of our elite divisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/origins"
                className="inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-steel to-steel-light text-foreground font-bold rounded-lg hover:shadow-[0_0_40px_rgba(17,78,98,0.6)] hover:scale-105 transition-all duration-300 uppercase tracking-wider"
              >
                Learn Our History
              </Link>
              <Link
                href="/code"
                className="inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-crimson to-crimson-light text-foreground font-bold rounded-lg hover:shadow-[0_0_40px_rgba(71,0,0,0.6)] hover:scale-105 transition-all duration-300 uppercase tracking-wider"
              >
                Read the Code
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
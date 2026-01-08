"use client";

import { SafeImage } from "@/components/utils/SafeImage";
import { DIVISION_GLOW } from "@/lib/divisions/divisionConfig";
import type { DivisionMember } from "@/lib/divisions/getDivisionsRoster";
import { RosterSection } from "./RosterSection";

/* ================= TYPES ================= */

interface DivisionPageTemplateProps {
  divisionSlug: "arcops" | "locops" | "specops" | "tacops";
  divisionName: string;
  divisionQuote: string;
  divisionDescription: string;
  patchImagePath: string;
  patchAlt: string;
  officers: DivisionMember[];
  members: DivisionMember[];
}

/* ================= TEMPLATE ================= */

export function DivisionPageTemplate({
  divisionSlug,
  divisionName,
  divisionQuote,
  divisionDescription,
  patchImagePath,
  patchAlt,
  officers,
  members,
}: DivisionPageTemplateProps) {
  const glow = DIVISION_GLOW[divisionSlug];

  return (
    <div className="min-h-screen bg-background-base">
      {/* HEADER */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 py-16 text-center">
          {/* PATCH */}
          <div className="flex justify-center mb-10">
            <div className="relative group w-fit">
              {/* GLOW — hover only */}
              <div
                className="absolute inset-0 rounded-full blur-3xl scale-110 opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:blur-[90px]"
                style={{ backgroundColor: glow }}
              />
              <SafeImage
                src={patchImagePath}
                alt={patchAlt}
                width={220}
                height={220}
                className="relative z-10 drop-shadow-2xl transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </div>

          {/* TITLE */}
          <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-widest text-foreground mb-6">
            {divisionName}
          </h1>

          {/* QUOTE + DESCRIPTION */}
          <p className="max-w-3xl mx-auto text-lg text-foreground-muted leading-relaxed whitespace-pre-line">
            <span
              className="block mb-6 text-2xl md:text-3xl italic font-medium"
              style={{
                color: glow,
                textShadow: `0 0 14px ${glow}`,
              }}
            >
              {divisionQuote}
            </span>
            {divisionDescription}
          </p>
        </div>
      </section>
      {/* DIVIDER */}
      <div className="relative w-full h-4 flex items-center justify-center mb-6">
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-white to-transparent opacity-40 z-10" />
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-12">
        {officers.length > 0 && <RosterSection title="Division Officers" members={officers} />}
        {members.length > 0 && <RosterSection title="Division Staff" members={members} />}
      </div>
    </div>
  );
}

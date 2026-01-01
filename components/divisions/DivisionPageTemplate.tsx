"use client";

import { SafeImage } from "@/components/utils/SafeImage";
import { DIVISION_GLOW } from "@/lib/divisions/divisionConfig";

/* ================= TYPES ================= */

export interface DivisionMember {
  id: string;
  characterName: string;
  rank: string;
  rankSortOrder: number;
  bio: string;
  portraitUrl?: string | null;
  subdivisionName?: string | null;
}

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
      <DivisionSection title="Officers" list={officers} />
      <DivisionSection title="Members" list={members} />
    </div>
  );
}

/* ================= SECTION ================= */

function DivisionSection({
  title,
  list,
}: {
  title: string;
  list: DivisionMember[];
}) {
  if (!list.length) return null;

  return (
    <section className="py-16 border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-center text-3xl font-bold uppercase tracking-widest text-foreground mb-12">
          {title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {list.map((member) => (
            <DivisionCard key={member.id} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= CARD ================= */

function DivisionCard({ member }: { member: DivisionMember }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-1">
      <div className="rounded-xl bg-[#0b0e17] overflow-hidden h-full">
        <div className="p-4">
          <p className="text-xs uppercase tracking-widest text-white/60">
            {member.subdivisionName || member.rank}
          </p>
          <h3 className="text-xl font-semibold text-white">
            {member.characterName}
          </h3>
          <p className="mt-2 text-sm text-white/80 whitespace-pre-line">
            {member.bio}
          </p>
        </div>
      </div>
    </article>
  );
}

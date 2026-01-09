import { SafeImage } from "@/components/utils/SafeImage";
import { MemberCard } from "./MemberCard";
import type { LeadershipMember } from "@/lib/divisions/getLeadershipRoster";

interface LeadershipPageTemplateProps {
  divisionSlug: "division";
  divisionName: string;
  divisionDescription: string;
  patchImagePath: string;
  patchAlt: string;
  leadershipCore: LeadershipMember[];
  officers: LeadershipMember[];
}

export default function LeadershipPageTemplate({
  divisionName,
  divisionDescription,
  patchImagePath,
  patchAlt,
  leadershipCore,
  officers,
}: LeadershipPageTemplateProps) {
  return (
    <main className="min-h-screen bg-background-base">
      {/* HEADER */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 py-16 text-center">
          {/* PATCH */}
          <div className="flex justify-center mb-10">
            <div className="relative group w-fit">
              {/* GLOW — hover only */}
              <div
                className="absolute inset-0 rounded-full blur-3xl scale-110 opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:blur-[90px]"
                style={{ backgroundColor: "#470000" }}
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

          <p
            className="text-2xl md:text-3xl italic font-medium tracking-wide mt-2 mb-10"
            style={{
              background: "linear-gradient(to bottom, #6b0000, #2a0000)",
              WebkitBackgroundClip: "text",
              color: "transparent",
              textShadow: "0 0 0px rgba(255,255,255,0.10)",
            }}
          >
            We lead by serving the pack, and stand last so others may stand
            strong.
          </p>

          {/* DESCRIPTION */}
          <p className="max-w-3xl mx-auto text-lg text-foreground-muted leading-relaxed whitespace-pre-line">
            {divisionDescription}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-16 space-y-16">
        {/* LEADERSHIP CORE SECTION */}
        {leadershipCore.length > 0 && (
          <section>
            {/* DIVIDER */}
            <div className="relative w-full h-4 flex items-center justify-center mb-8">
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-40" />
            </div>

            {/* TITLE */}
            <h2 className="text-center text-3xl font-bold uppercase tracking-widest text-foreground mb-12">
              Leadership Core
            </h2>

            {/* GRID */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {leadershipCore.map((member) => (
                <MemberCard
                  key={member.id}
                  member={{
                    ...member,
                    callSign: member.callSign ?? null,
                    portraitUrl: member.portraitUrl ?? null,
                    subdivisionName: member.subdivisionName ?? null,
                    subdivisionSlug: member.subdivisionSlug ?? null,
                    subdivisionPatchPath: member.subdivisionPatchPath ?? null,
                    discordUsername: member.discordUsername ?? null,
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* OFFICERS SECTION */}
        {officers.length > 0 && (
          <section>
            {/* DIVIDER */}
            <div className="relative w-full h-4 flex items-center justify-center mb-8">
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-40" />
            </div>

            {/* TITLE */}
            <h2 className="text-center text-3xl font-bold uppercase tracking-widest text-foreground mb-12">
              Officers
            </h2>

            {/* GRID */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {officers.map((member) => (
                <MemberCard
                  key={member.id}
                  member={{
                    ...member,
                    callSign: member.callSign ?? null,
                    portraitUrl: member.portraitUrl ?? null,
                    subdivisionName: member.subdivisionName ?? null,
                    subdivisionSlug: member.subdivisionSlug ?? null,
                    subdivisionPatchPath: member.subdivisionPatchPath ?? null,
                    discordUsername: member.discordUsername ?? null,
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

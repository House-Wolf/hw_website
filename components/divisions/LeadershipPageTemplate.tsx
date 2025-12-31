"use client";

import { useEffect, useState } from "react";
import { SafeImage } from "@/components/utils/SafeImage";

interface DivisionMember {
  id: string;
  characterName: string;
  callSign?: string | null;
  rank: string;
  rankSortOrder: number;
  bio: string;
  portraitUrl?: string | null;
  subdivisionName?: string | null;
  discordUsername?: string;
  role?: string;
}

interface LeadershipPageTemplateProps {
  divisionSlug: string;
  divisionName: string;
  divisionDescription: string;
  patchImagePath: string;
  patchAlt: string;
}

/* Fetch Helpers */
async function fetchDivisionMembers(divisionSlug: string) {
  const res = await fetch(
    `/api/divisions/${encodeURIComponent(divisionSlug)}/members`,
    { cache: "no-store" }
  );

  const text = await res.text();

  if (!res.ok) {
    // Parse error response for detailed message
    let errorMessage = `Failed to fetch division members (${res.status})`;
    let errorDetails = text;

    try {
      const errorData = JSON.parse(text);
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
      errorDetails = JSON.stringify(errorData, null, 2);
    } catch {
      // If not JSON, use raw text
    }

    console.error("Backend returned error:", {
      status: res.status,
      message: errorMessage,
      body: errorDetails,
      slug: divisionSlug,
    });

    throw new Error(errorMessage);
  }

  return JSON.parse(text);
}

/**
 * @component LeadershipPageTemplate
 * @description Template component specifically for the Leadership/Command page with custom section names.
 * @author House Wolf Dev Team
 */
export default function LeadershipPageTemplate({
  divisionSlug,
  divisionName,
  divisionDescription,
  patchImagePath,
  patchAlt,
}: LeadershipPageTemplateProps) {
  const [leadershipCore, setLeadershipCore] = useState<DivisionMember[]>([]);
  const [officers, setOfficers] = useState<DivisionMember[]>([]);
  const [ncos, setNcos] = useState<DivisionMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Fetch on mount or slug change */
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchDivisionMembers(divisionSlug);
        // Map API response to our section names
        setLeadershipCore(data.commandRoster || []);
        setOfficers(data.officers || []);
        setNcos(data.members || []); // Members become NCOs for Leadership page
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("[LeadershipPage] Error fetching members:", {
          slug: divisionSlug,
          error: err instanceof Error ? err.message : err,
        });
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [divisionSlug]);

  return (
    <div className="min-h-screen bg-background-base">
      {/* Header */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-crimson/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-steel/5 via-transparent to-steel/5" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
          <div className="text-center">
            <div className="flex justify-center mb-10">
              <div className="relative group w-fit">
                <SafeImage
                  src={patchImagePath}
                  alt={patchAlt}
                  width={200}
                  height={200}
                  className="drop-shadow-2xl transition-transform duration-700 group-hover:scale-105 w-28 sm:w-36 md:w-44 lg:w-52 xl:w-60 h-auto"
                />
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-widest text-foreground mb-4">
              {divisionName}
            </h1>

            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-foreground-muted max-w-3xl mx-auto leading-relaxed px-4">
              {divisionDescription}
            </p>
          </div>
        </div>
      </section>
      <div className="relative w-full h-4 flex items-center justify-center mb-6">
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-white to-transparent opacity-40 z-10" />
      </div>
      {/* Loading */}
      {isLoading && (
        <section className="py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-crimson" />
          <p className="mt-4 text-foreground-muted">
            Loading division members…
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-white to-transparent opacity-40 z-10" />
        </section>
      )}

      {/* Error */}
      {error && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="card bg-background-elevated p-6 text-center">
              <p className="text-crimson">{error}</p>
            </div>
          </div>
        </section>
      )}

      {/* Content - Custom section names for Leadership */}
      {!isLoading && !error && (
        <>
          <DivisionSection title="Leadership Core" list={leadershipCore} />
          <DivisionSection title="Officers" list={officers} />
          <DivisionSection title="Non-Commissioned Officers" list={ncos} />
        </>
      )}
    </div>
  );
}

/* Section Component */
function DivisionSection({
  title,
  list,
}: {
  title: string;
  list: DivisionMember[];
}) {
  if (!list || list.length === 0) return null;

  return (
    <section className="py-14 md:py-16 border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl md:text-4xl font-bold uppercase tracking-widest text-foreground mb-12">
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

/* Card Component */
function DivisionCard({ member }: { member: DivisionMember }) {
  const profileImage = member.portraitUrl || "/images/default-avatar.png";

  return (
    <article className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-1 transition">
      <div className="rounded-xl bg-[#0b0e17] overflow-hidden flex flex-col h-full">
        <div className="relative h-64 w-full border-b border-white/5">
          <SafeImage
            src={profileImage}
            alt={member.characterName}
            fill
            className="object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-transparent to-transparent opacity-60" />

          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/70">
              {member.subdivisionName || member.rank}
            </p>
            <h3 className="text-xl font-semibold text-white drop-shadow-lg">
              {member.characterName}
            </h3>
          </div>
        </div>

        <div className="p-3 text-white/80 text-sm leading-snug whitespace-pre-line">
          {member.bio}
        </div>
      </div>
    </article>
  );
}

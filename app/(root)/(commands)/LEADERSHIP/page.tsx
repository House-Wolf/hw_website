"use server";

import React from "react";
import { SafeImage } from "@/components/utils/SafeImage";
import { prisma } from "@/lib/prisma";

// Types for leadership members
interface LeadershipMember {
  id: string;
  name: string;
  rank: string;
  bio: string;
  imageUrl?: string;
  discordId?: string;
  joinDate?: string;
  specializations?: string[];
}

async function fetchApprovedLeadership(): Promise<LeadershipMember[]> {
  const rows = (await prisma.$queryRaw`
    SELECT
      mp.id,
      mp.character_name AS name,
      mp.bio,
      mp.portrait_url AS image_url,
      d.name AS division_name,
      s.name AS subdivision_name
    FROM mercenary_profiles mp
    LEFT JOIN divisions d ON d.id = mp.division_id
    LEFT JOIN subdivisions s ON s.id = mp.subdivision_id
    WHERE mp.status = 'APPROVED'
    ORDER BY mp.approved_at DESC NULLS LAST, mp.last_submitted_at DESC NULLS LAST;
  `) as Array<{
    id: string;
    name: string;
    bio: string;
    image_url: string | null;
    division_name: string | null;
    subdivision_name: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    rank: row.division_name || "House Wolf",
    bio: row.bio,
    imageUrl: row.image_url || undefined,
    specializations: row.subdivision_name ? [row.subdivision_name] : undefined,
  }));
}

const LeadershipPage = async () => {
  const leadershipCore = await fetchApprovedLeadership();
  const officers: LeadershipMember[] = [];
  const ncos: LeadershipMember[] = [];

  return (
    <div className="min-h-screen bg-background-base">
      {/* Hero Section with Patch */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 bg-linear-to-r from-steel/5 via-transparent to-steel/5" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Leadership Patch */}
            <div className="flex justify-center mb-8">
              <div className="relative group">
                {/* Soft glow ONLY on hover */}
                <div className="absolute inset-0 blur-2xl bg-transparent transition-all duration-700 group-hover:bg-crimson/25" />

                <div className="relative rounded-full overflow-visible">
                  <SafeImage
                    src="/images/divisions/leadership.png"
                    alt="Leadership Core Patch"
                    width={200}
                    height={200}
                    className="
                      transition-transform duration-700
                      hover:scale-105 
                     hover:drop-shadow-[0_0_35px_rgba(220,38,38,0.65)]
                    "
                  />

                  {/* ONLY glow outline on hover — no static border */}
                  <div
                    className="
                      absolute inset-0 rounded-full pointer-events-none 
                      transition-all duration-700
                      hover:shadow-[0_0_30px_rgba(220,38,38,0.45)]
                    "
                  />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold uppercase tracking-widest text-foreground mb-4">
              House Wolf Command
            </h1>
            <div className="w-24 h-1 bg-linear-to-r from-transparent via-crimson to-transparent mx-auto mb-6" />
            <p className="text-left text-lg md:text-xl text-foreground-muted max-w-3xl mx-auto leading-relaxed">
              The elite command structure of House Wolf. Our leaders have proven
              themselves through honor, strength, and unwavering dedication to
              the pack.
            </p>
            <br />
            <p className="text-left text-lg md:text-xl text-foreground-muted max-w-3xl mx-auto leading-relaxed">
              House Wolf Command is the central authority responsible for the
              coordination and oversight of all operations. Serving as the
              guiding force behind every division, they ensure seamless
              collaboration and strategic alignment across the organization.
              While their presence is rarely needed in day-to-day activities,
              House Wolf Command steps in decisively when situations demand
              critical intervention. With a focus on vision, accountability, and
              decisive action, House Wolf Command provides the steady hand that
              drives success and maintains organizational integrity.
            </p>
          </div>
        </div>
      </section>

      {/* Leadership Core Section */}
      <section className="py-16 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-widest text-foreground">
              Leadership Core
            </h2>
          </div>

          {leadershipCore.length === 0 ? (
            <EmptyState label="Leadership core coming soon" />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {leadershipCore.map((member) => (
                <LeadershipCard key={member.id} member={member} compact />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Officers Section */}
      <section className="py-16 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-widest text-foreground">
              Officers
            </h2>
          </div>

          {officers.length === 0 ? (
            <EmptyState label="Officers will be posted here" />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {officers.map((member) => (
                <LeadershipCard key={member.id} member={member} compact />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Non-Commissioned Officers Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-widest text-foreground">
              Non-Commissioned Officers
            </h2>
          </div>

          {ncos.length === 0 ? (
            <EmptyState label="NCO roster coming soon" />
          ) : (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {ncos.map((member) => (
                <LeadershipCard key={member.id} member={member} compact />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// Reusable Leadership Card Component
interface LeadershipCardProps {
  member: LeadershipMember;
  compact?: boolean;
}

const LeadershipCard: React.FC<LeadershipCardProps> = ({
  member,
  compact = false,
}) => {
  return (
    <div className="card group h-full flex flex-col">
      {/* Image */}
      <div
        className={`relative w-full ${
          compact ? "aspect-square" : "aspect-4/3"
        } mb-4 rounded-lg overflow-hidden border border-border-subtle group-hover:border-steel/50 transition-colors`}
      >
        {member.imageUrl ? (
          <SafeImage
            src={member.imageUrl}
            alt={member.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-background-elevated flex items-center justify-center"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-steel-light transition-colors">
            {member.name}
          </h3>
          <div className="badge badge-secondary text-xs">{member.rank}</div>
        </div>

        <p
          className={`text-foreground-muted text-sm leading-relaxed mb-4 flex-1 ${
            compact ? "line-clamp-4" : "line-clamp-6"
          }`}
        >
          {member.bio}
        </p>

        {/* Specializations */}
        {member.specializations && member.specializations.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-steel-light mb-2 font-semibold">
              Specializations
            </h4>
            <div className="flex flex-wrap gap-1">
              {member.specializations.map((spec, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-background-elevated border border-border-subtle rounded text-xs text-foreground-muted"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadershipPage;

function EmptyState({ label }: { label: string }) {
  return (
    <div className="border border-border-subtle rounded-lg p-6 text-center bg-background-elevated/60 text-foreground-muted">
      {label}
    </div>
  );
}

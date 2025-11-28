"use client";

import React from "react";
import { SafeImage } from "@/components/utils/SafeImage";

// Types for division members
interface DivisionMember {
  id: string;
  name: string;
  rank: string;
  bio: string;
  imageUrl?: string;
  discordId?: string;
  joinDate?: string;
  specializations?: string[];
}

// Mock data - will be replaced with backend API calls
const commandRoster: DivisionMember[] = [
  {
    id: "1",
    name: "TBD",
    rank: "Captain",
    bio: "Commands SPECOPS division and oversees all special operations, including infiltration, medical support, and covert missions.",
    specializations: ["Division Command", "Special Operations"],
  },
  {
    id: "2",
    name: "TBD",
    rank: "Lieutenant",
    bio: "Supports the Captain in coordinating SPECOPS missions and specialized unit deployment.",
    specializations: ["Operations", "Tactical Planning"],
  },
  {
    id: "3",
    name: "TBD",
    rank: "Field Marshal",
    bio: "Leads field-based special operations and coordinates elite unit actions.",
    specializations: ["Field Operations", "Elite Tactics"],
  },
  {
    id: "4",
    name: "TBD",
    rank: "Platoon Sergeant",
    bio: "Manages specialized platoon operations and ensures operational readiness of SPECOPS teams.",
    specializations: ["Platoon Leadership", "Operational Readiness"],
  },
];

const members: DivisionMember[] = [
  {
    id: "5",
    name: "TBD",
    rank: "Member",
    bio: "SPECOPS operative specializing in medical support and combat rescue operations.",
    specializations: ["Medical"],
  },
  {
    id: "6",
    name: "TBD",
    rank: "Member",
    bio: "SPECOPS operative specializing in covert operations and infiltration.",
    specializations: ["Infiltration"],
  },
];

const SPECOPSPage = () => {
  return (
    <div className="min-h-screen bg-background-base">
      {/* Hero Section with Patch */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 bg-linear-to-b from-crimson/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-steel/5 via-transparent to-steel/5" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Division Patch */}
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-crimson/20 blur-2xl group-hover:bg-crimson/30 transition-all duration-slow" />
                <div className="relative">
                  <SafeImage
                    src="/images/divisions/specops/specops.png"
                    alt="SPECOPS Patch"
                    width={200}
                    height={200}
                    className="drop-shadow-2xl transition-transform duration-slow group-hover:scale-105"
                  />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold uppercase tracking-widest text-foreground mb-4">
              SPECOPS
            </h1>
            <div className="w-24 h-1 bg-linear-to-r from-transparent via-crimson to-transparent mx-auto mb-6" />
            <p className="text-left text-lg md:text-xl text-foreground-muted max-w-3xl mx-auto leading-relaxed">
              The Special Operations Division is the tip of the spear, leading the charge in executing high-risk,
              high-reward missions with precision and excellence. As the first to strike, this elite division specializes
              in critical tasks that demand adaptability, skill, and unwavering resolve. Whether operating in hostile environments
              securing key objectives, or executing covert operations, the Special Operations Division embodies the pinnacle
              of operational effectiveness. They are the decisive edge in the most challenging and high-stakes scenarios,
              where success is non-negotiable.
            </p>
          </div>
        </div>
      </section>

      {/* Command Section */}
      <section className="py-16 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-widest text-foreground">
              Command
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {commandRoster.map((member) => (
              <DivisionCard key={member.id} member={member} compact />
            ))}
          </div>
        </div>
      </section>

      {/* Members Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-widest text-foreground">
              Members
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {members.map((member) => (
              <DivisionCard key={member.id} member={member} compact />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Reusable Division Card Component
interface DivisionCardProps {
  member: DivisionMember;
  compact?: boolean;
}

const DivisionCard: React.FC<DivisionCardProps> = ({ member, compact = false }) => {
  return (
    <div className="card group h-full flex flex-col">
      {/* Image */}
      <div className={`relative w-full ${compact ? 'aspect-square' : 'aspect-4/3'} mb-4 rounded-lg overflow-hidden border border-border-subtle group-hover:border-steel/50 transition-colors`}>
        {member.imageUrl ? (
          <SafeImage
            src={member.imageUrl}
            alt={member.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-background-elevated flex items-center justify-center">
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-steel-light transition-colors">
            {member.name}
          </h3>
          <div className="badge badge-secondary text-xs">
            {member.rank}
          </div>
        </div>

        <p className={`text-foreground-muted text-sm leading-relaxed mb-4 flex-1 ${compact ? 'line-clamp-4' : 'line-clamp-6'}`}>
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

export default SPECOPSPage;

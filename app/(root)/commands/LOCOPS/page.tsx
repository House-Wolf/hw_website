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
    bio: "Commands LOCOPS division and oversees all logistics, mining, and salvage operations across House Wolf.",
    specializations: ["Division Command", "Logistics"],
  },
  {
    id: "2",
    name: "TBD",
    rank: "Lieutenant",
    bio: "Supports the Captain in coordinating LOCOPS operations and supply chain management.",
    specializations: ["Operations", "Supply Chain"],
  },
  {
    id: "3",
    name: "TBD",
    rank: "Field Marshal",
    bio: "Leads ground-based logistics operations and resource extraction missions.",
    specializations: ["Ground Operations", "Resource Management"],
  },
  {
    id: "4",
    name: "TBD",
    rank: "Platoon Sergeant",
    bio: "Manages platoon-level logistics operations and coordinates mining/salvage teams.",
    specializations: ["Platoon Leadership", "Team Coordination"],
  },
];

const members: DivisionMember[] = [
  {
    id: "5",
    name: "TBD",
    rank: "Member",
    bio: "LOCOPS operative specializing in mining and resource extraction operations.",
    specializations: ["Mining"],
  },
  {
    id: "6",
    name: "TBD",
    rank: "Member",
    bio: "LOCOPS operative specializing in salvage and recovery operations.",
    specializations: ["Salvage"],
  },
];

const LOCOPSPage = () => {
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
                    src="/images/divisions/locops/locops.png"
                    alt="LOCOPS Patch"
                    width={200}
                    height={200}
                    className="drop-shadow-2xl transition-transform duration-slow group-hover:scale-105"
                  />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold uppercase tracking-widest text-foreground mb-4">
              LOCOPS
            </h1>
            <div className="w-24 h-1 bg-linear-to-r from-transparent via-crimson to-transparent mx-auto mb-6" />
           <p className="text-left text-lg md:text-xl text-foreground-muted max-w-3xl mx-auto leading-relaxed">
              The Logistics and Command Operations Division (Locops) serves as the backbone of the organization,
              ensuring seamless coordination between logistical support and strategic command operations. As the
              heart of the team, Locops drives mission success by managing resources, streamlining communication,
              and maintaining operational readiness. From supply chain management to command coordination, this
              division is integral to keeping the entire operation running smoothly and efficiently. Locops embodies
               reliability, precision, and teamwork, empowering the organization to achieve its objectives with unwavering support.
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

export default LOCOPSPage;

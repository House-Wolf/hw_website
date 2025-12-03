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
    bio: "Commands ARCCOPS division and oversees all reconnaissance and exploration operations across the verse.",
    specializations: ["Division Command", "Reconnaissance"],
  },
  {
    id: "2",
    name: "TBD",
    rank: "Lieutenant",
    bio: "Supports the Captain in coordinating ARCCOPS operations and mission planning.",
    specializations: ["Operations", "Mission Planning"],
  },
  {
    id: "3",
    name: "TBD",
    rank: "Field Marshal",
    bio: "Leads ground-based reconnaissance missions and tactical field operations.",
    specializations: ["Ground Operations", "Tactical Recon"],
  },
  {
    id: "4",
    name: "TBD",
    rank: "Platoon Sergeant",
    bio: "Manages platoon-level operations and provides direct leadership to ARCCOPS units.",
    specializations: ["Platoon Leadership", "Unit Coordination"],
  },
];

const members: DivisionMember[] = [
  {
    id: "5",
    name: "TBD",
    rank: "Member",
    bio: "ARCCOPS operative specializing in exploration and reconnaissance missions.",
    specializations: ["Exploration"],
  },
  {
    id: "6",
    name: "TBD",
    rank: "Member",
    bio: "ARCCOPS operative specializing in exploration and reconnaissance missions.",
    specializations: ["Reconnaissance"],
  },
];

const ARCCOPSPage = () => {
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
                    {/* Soft glow ONLY on hover */}
                <div className="absolute inset-0 blur-2xl bg-transparent transition-all duration-700 group-hover:bg-cyan-800/45" />
                <div className="absolute inset-0 bg-crimson/20 blur-2xl group-hover:bg-crimson/30 transition-all duration-slow" />
                <div className="relative">
                  <SafeImage
                    src="/images/divisions/arccops/arccops.png"
                    alt="ARCCOPS Patch"
                    width={200}
                    height={200}
                    className="drop-shadow-2xl transition-transform duration-slow group-hover:scale-105"
                  />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold uppercase tracking-widest text-foreground mb-4">
              ARCCOPS
            </h1>
            <div className="w-24 h-1 bg-linear-to-r from-transparent via-crimson to-transparent mx-auto mb-6" />
           <p className="text-left text-lg md:text-xl text-foreground-muted max-w-3xl mx-auto leading-relaxed">
              The Advanced Research & Cartography Operations Division (ARCCOPS) serves as the organization’s forward
              edge into the unknown, combining scientific analysis, strategic exploration, and precision fabrication
              to enhance operational capability. Acting as researchers, pathfinders, and master craftsmen, ARCCOPS
              identifies critical intel, charts viable routes, and produces mission-ready equipment essential to
              sustained deployment. From assessing anomalous phenomena to mapping uncharted territory and manufacturing
              specialized gear, they deliver the information, innovation, and material support that strengthen every
              division. ARCCOPS embodies discipline, precision, and adaptability—turning the uncertainties of the frontier
              into tactical advantages.
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

export default ARCCOPSPage;

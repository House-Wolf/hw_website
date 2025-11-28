"use client";

import React from "react";
import { SafeImage } from "@/components/utils/SafeImage";

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

// Mock data - will be replaced with backend API calls
const leadershipCore: LeadershipMember[] = [
  {
    id: "1",
    name: "TBD",
    rank: "Clan Lord",
    bio: "Founder and supreme commander of House Wolf. A veteran mercenary with decades of experience across the verse, Magnus built House Wolf from the ground up, establishing it as one of the most elite and respected mercenary organizations in the galaxy. His tactical brilliance and unwavering dedication to the code have shaped the very foundation of what it means to be a Wolf.",
    joinDate: "2945",
    specializations: ["Strategic Command", "Tactical Leadership"],
  },
  {
    id: "2",
    name: "TBD",
    rank: "Hand of the Clan",
    bio: "The right hand of the Clan Lord, responsible for operational oversight and strategic planning across all divisions.",
    specializations: ["Operations", "Strategy"],
  },
  {
    id: "3",
    name: "TBD",
    rank: "High Councilor",
    bio: "Manages internal affairs, personnel, and ensures the smooth operation of House Wolf's day-to-day activities.",
    specializations: ["Administration", "Personnel Management"],
  },
  {
    id: "4",
    name: "TBD",
    rank: "Armor",
    bio: "Oversees defensive operations, armor deployment, and protective strategies for House Wolf operations.",
    specializations: ["Defense", "Armor Operations"],
  },
];

const officers: LeadershipMember[] = [
  {
    id: "5",
    name: "TBD",
    rank: "Fleet Commander",
    bio: "Commands House Wolf's fleet operations and naval strategic deployments across the verse.",
    specializations: ["Fleet Operations", "Naval Strategy"],
  },
  {
    id: "6",
    name: "TBD",
    rank: "Captain",
    bio: "Leads tactical operations and coordinates mission execution for critical engagements.",
    specializations: ["Tactical Operations", "Mission Leadership"],
  },
  {
    id: "7",
    name: "TBD",
    rank: "Lieutenant",
    bio: "Supports operational command and manages frontline unit coordination.",
    specializations: ["Unit Coordination", "Operations Support"],
  },
];

const ncos: LeadershipMember[] = [
  {
    id: "8",
    name: "TBD",
    rank: "Field Marshal",
    bio: "Leads ground operations and ensures tactical readiness across all enlisted personnel.",
    specializations: ["Ground Operations", "Tactical Leadership"],
  },
  {
    id: "9",
    name: "TBD",
    rank: "Platoon Sergeant",
    bio: "Provides direct leadership and mentorship to platoon-level units in the field.",
    specializations: ["Platoon Leadership", "Mentorship"],
  },
];

const LeadershipPage = () => {
  return (
    <div className="min-h-screen bg-background-base">
      {/* Hero Section with Patch */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 bg-linear-to-b from-crimson/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-steel/5 via-transparent to-steel/5" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Leadership Patch */}
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-crimson/20 blur-2xl group-hover:bg-crimson/30 transition-all duration-slow" />
                <div className="relative">
                  <SafeImage
                    src="/images/divisions/leadership.png"
                    alt="Leadership Core Patch"
                    width={200}
                    height={200}
                    className="drop-shadow-2xl transition-transform duration-slow group-hover:scale-105"
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
              The elite command structure of House Wolf. Our leaders have proven themselves through
              honor, strength, and unwavering dedication to the pack.
            </p>
            <br />
            <p className="text-left text-lg md:text-xl text-foreground-muted max-w-3xl mx-auto leading-relaxed">
              House Wolf Command is the central authority responsible for the coordination and oversight of all operations.
              Serving as the guiding force behind every division, they ensure seamless collaboration and strategic alignment across
              the organization. While their presence is rarely needed in day-to-day activities, House Wolf Command steps in decisively
              when situations demand critical intervention. With a focus on vision, accountability, and decisive action, House Wolf
              Command provides the steady hand that drives success and maintains organizational integrity.
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {leadershipCore.map((member) => (
              <LeadershipCard key={member.id} member={member} compact />
            ))}
          </div>
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {officers.map((member) => (
              <LeadershipCard key={member.id} member={member} compact />
            ))}
          </div>
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

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {ncos.map((member) => (
              <LeadershipCard key={member.id} member={member} compact />
            ))}
          </div>
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

const LeadershipCard: React.FC<LeadershipCardProps> = ({ member, compact = false }) => {
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

export default LeadershipPage;

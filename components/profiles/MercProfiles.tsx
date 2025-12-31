"use client";

import { SafeImage } from "@/components/utils/SafeImage";

export interface MercProfile {
  id: string;
  name: string;
  rank: string;
  bio: string;
  imageUrl?: string | null;
  specializations?: string[];
  updatedAt?: string | null;
}

interface MercProfileCardProps {
  member: MercProfile;
  compact?: boolean;
}

/**
 * @component MercProfileCard
 * @description Renders a profile card for a mercenary member with their image, name, rank, bio, and specializations.
 * @param {MercProfileCardProps} props - The properties for the MercProfileCard component.
 * @param {MercProfile} props.member - The mercenary member data to display.
 * @param {boolean} [props.compact=false] - Whether to render the card in a compact style.  
 * @returns {JSX.Element} The rendered profile card.
 * @author House Wolf Dev Team
 */
export default function MercProfileCard({ member, compact = false }: MercProfileCardProps) {
  const profileImage =
    member.imageUrl && member.imageUrl.trim() !== ""
      ? member.imageUrl
      : "/images/global/HWiconnew.png";

  return (
    <article className="flex-shrink-0 w-full group rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-1 transition hover:shadow-[0_15px_40px_rgba(220,38,38,0.6)]">
      <div className="rounded-xl bg-[#0b0e17] overflow-hidden flex flex-col h-full">
        {/* Image section with overlay text */}
        <div className="relative h-64 w-full border-b border-white/5 bg-slate-900">
          <SafeImage
            src={profileImage}
            alt={member.name}
            fill
            className="object-cover"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-transparent to-transparent opacity-60 pointer-events-none" />

          {/* Overlay text */}
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/70 drop-shadow-lg">
              {member.rank}
            </p>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white drop-shadow-lg">
                {member.name}
              </h3>
            </div>
          </div>
        </div>

        {/* Bio section */}
        <div className="flex flex-1 flex-col gap-2 p-3 text-white/80 text-sm">
          <p className="flex-1 whitespace-pre-line leading-snug text-white/90">
            {member.bio}
          </p>
          {member.specializations && member.specializations.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {member.specializations.map((spec, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-white/10 border border-white/20 rounded text-xs text-white/70"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

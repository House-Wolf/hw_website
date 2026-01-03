import { SafeImage } from "@/components/utils/SafeImage";
import { getMemberGlow } from "@/lib/members/getMemberGlow";
import type { DivisionMember } from "@/lib/divisions/getDivisionsRoster";

export function MemberCard({ member }: { member: DivisionMember }) {
  const glowColor = getMemberGlow(member);
  const profileImage = member.portraitUrl || "/images/global/HWiconnew.png";

  return (
    <div className="relative group">
      {/* ===== OUTER GLOW (ENTIRE CARD) ===== */}
      <div
        className="
          absolute -inset-1 rounded-3xl opacity-0 blur-3xl
          transition-all duration-700
          group-hover:opacity-100
          group-hover:blur-[90px]
        "
        style={{ backgroundColor: glowColor }}
      />

      {/* ===== CARD ===== */}
      <article className="relative z-10 rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-1">
        <div className="rounded-xl bg-[#0b0e17] overflow-hidden flex flex-col h-full">

          {/* IMAGE */}
          <div className="relative h-72 w-full">
            <SafeImage
              src={profileImage}
              alt={member.characterName}
              fill
              className="object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-transparent to-transparent" />

            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-[10px] tracking-[0.35em] uppercase text-white/60">
                {member.subdivisionName || member.rank}
              </p>
              <h3 className="text-2xl font-semibold text-white drop-shadow-lg">
                {member.characterName}
              </h3>
            </div>
          </div>

          {/* BIO */}
          <div className="p-5 text-white/80 text-sm leading-relaxed whitespace-pre-line">
            {member.bio}
          </div>
        </div>
      </article>
    </div>
  );
}
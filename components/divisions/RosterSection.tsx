import type { DivisionMember } from "@/lib/divisions/getDivisionsRoster";
import { MemberCard } from "./MemberCard";

export function RosterSection({
  title,
  members,
}: {
  title: string;
  members: DivisionMember[];
}) {
  return (
    <section className="py-8">
      {/* DIVIDER */}
      <div className="relative w-full h-4 flex items-center justify-center mb-8">
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-40" />
      </div>

      {/* TITLE */}
      <h2 className="text-center text-3xl font-bold uppercase tracking-widest text-foreground mb-12">
        {title}
      </h2>

      {/* GRID */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
        {members.map((m) => (
          <MemberCard key={m.id} member={m} />
        ))}
      </div>
    </section>
  );
}

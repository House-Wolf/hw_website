import type { DivisionMember } from "@/lib/divisions/getDivisionsRoster";
import { MemberCard } from "./MemeberCard";

export function RosterSection({
  title,
  members,
}: {
  title: string;
  members: DivisionMember[];
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <span className="text-sm text-white/60">{members.length} total</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <MemberCard key={m.id} member={m} />
        ))}
      </div>
    </section>
  );
}

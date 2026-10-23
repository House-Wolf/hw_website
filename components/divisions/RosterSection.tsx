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

      {/* Center every row, including an incomplete final row. */}
      <div className="flex flex-wrap items-stretch justify-center gap-6">
        {members.map((m) => (
          <div key={m.id} className="w-full min-w-0 sm:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)]">
            <MemberCard member={m} />
          </div>
        ))}
      </div>
    </section>
  );
}

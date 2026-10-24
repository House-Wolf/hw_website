import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { DivisionPageTemplate } from "@/components/divisions/DivisionPageTemplate";
import { RosterSection } from "@/components/divisions/RosterSection";
import { DIVISIONS, isDivisionSlug } from "@/lib/divisions/divisionConfig";
import { getDivisionRoster } from "@/lib/divisions/getDivisionsRoster";
import { getAssignedUnitRoster, getDivisionSpecialty } from "@/lib/divisions/specialtyConfig";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string; unitSlug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, unitSlug } = await params;
  if (!isDivisionSlug(slug)) return {};
  const unit = getDivisionSpecialty(slug, unitSlug);
  if (!unit) return {};
  return {
    title: `${unit.title} | ${DIVISIONS[slug].name} Profiles | House Wolf Dragoons`,
    description: unit.description,
    alternates: { canonical: `/divisions/${slug}/units/${unit.slug}` },
  };
}

export default async function UnitProfilesPage({ params }: PageProps) {
  const { slug, unitSlug } = await params;
  const normalizedSlug = slug.toLowerCase().trim();
  if (!isDivisionSlug(normalizedSlug)) notFound();
  const unit = getDivisionSpecialty(normalizedSlug, unitSlug);
  if (!unit) notFound();
  const division = DIVISIONS[normalizedSlug];
  const roster = getAssignedUnitRoster(await getDivisionRoster(normalizedSlug), unit.slug);
  const count = roster.officers.length + roster.members.length;

  return (
    <DivisionPageTemplate
      divisionSlug={normalizedSlug}
      divisionName={unit.title}
      divisionQuote={`${division.name} / ${unit.focus}`}
      divisionDescription={unit.description}
      patchImagePath={unit.patchImagePath}
      patchAlt={unit.patchAlt}
      backHref={`/divisions/${normalizedSlug}`}
      backLabel={`Explore ${division.name} specialties`}
    >
      <div className="flex flex-col items-center justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row">
        <p className="text-sm text-foreground-muted">{count} assigned public {count === 1 ? "profile" : "profiles"}</p>
        <Link href={`/divisions/${normalizedSlug}/members`} className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-white underline underline-offset-4 hover:text-steel-light focus-visible:outline-white">
          All {division.name} profiles<ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {roster.officers.length > 0 && <RosterSection title="Unit Officers" members={roster.officers} />}
      {roster.members.length > 0 && <RosterSection title="Unit Staff" members={roster.members} />}
      {count === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-8 text-center sm:p-12">
          <h2 className="mb-3 text-2xl font-bold text-white">No public profiles assigned yet</h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-foreground-muted">Approved public profiles will appear here when members are assigned to {unit.title}. You can still explore the other {division.name} specialties.</p>
        </div>
      )}
    </DivisionPageTemplate>
  );
}

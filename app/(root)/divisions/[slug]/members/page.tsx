import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DivisionPageTemplate } from "@/components/divisions/DivisionPageTemplate";
import { DIVISIONS, isDivisionSlug } from "@/lib/divisions/divisionConfig";
import { getDivisionRoster } from "@/lib/divisions/getDivisionsRoster";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isDivisionSlug(slug)) return {};
  return {
    title: `${DIVISIONS[slug].name} Assigned Profiles | House Wolf Dragoons`,
    alternates: { canonical: `/divisions/${slug}/members` },
  };
}

export default async function DivisionMembersPage({ params }: PageProps) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase().trim();
  if (!isDivisionSlug(normalizedSlug)) notFound();
  const division = DIVISIONS[normalizedSlug];
  const roster = await getDivisionRoster(normalizedSlug);

  return (
    <DivisionPageTemplate
      divisionSlug={normalizedSlug}
      divisionName={`${division.name} Personnel`}
      divisionQuote={division.divsionQuote}
      divisionDescription={`Meet the officers and staff assigned to ${division.name}.`}
      patchImagePath={division.patchImagePath}
      patchAlt={division.patchAlt}
      officers={[...roster.commandRoster, ...roster.officers]}
      members={roster.members}
      backHref={`/divisions/${normalizedSlug}`}
      backLabel={`Explore ${division.name} specialties`}
    />
  );
}

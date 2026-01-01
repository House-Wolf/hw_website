import { notFound } from "next/navigation";
import { DIVISIONS } from "@/lib/divisions/divisionConfig";
import type { DivisionSlug } from "@/lib/divisions/divisionConfig";
import { getDivisionRoster } from "@/lib/divisions/getDivisionsRoster";
import { DivisionPageTemplate } from "@/components/divisions/DivisionPageTemplate";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function isDivisionSlug(value: string): value is DivisionSlug {
  return value in DIVISIONS;
}

export default async function DivisionPage({ params }: PageProps) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase().trim();

  if (!isDivisionSlug(normalizedSlug)) notFound();

  const division = DIVISIONS[normalizedSlug];
  const roster = await getDivisionRoster(normalizedSlug);

  return (
    <DivisionPageTemplate
      divisionSlug={normalizedSlug}
      divisionName={division.name}
      divisionQuote={division.divsionQuote}
      divisionDescription={division.description}
      patchImagePath={division.patchImagePath}
      patchAlt={division.patchAlt}
      officers={[...roster.commandRoster, ...roster.officers].map(officer => ({
        ...officer,
        discordUsername: officer.discordUsername ?? undefined,
      }))}
      members={roster.members.map(member => ({
        ...member,
        discordUsername: member.discordUsername ?? undefined,
      }))}
    />
  );
}

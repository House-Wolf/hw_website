import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";
import { DivisionPageTemplate } from "@/components/divisions/DivisionPageTemplate";
import { SpecialtyPatch } from "@/components/divisions/SpecialtyPatch";
import { DIVISIONS, isDivisionSlug } from "@/lib/divisions/divisionConfig";
import { DIVISION_SPECIALTIES } from "@/lib/divisions/specialtyConfig";
import styles from "./specialties.module.css";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(DIVISIONS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isDivisionSlug(slug)) return {};
  return {
    title: `${DIVISIONS[slug].name} Specialties | House Wolf Dragoons`,
    description: DIVISIONS[slug].description,
    alternates: { canonical: `/divisions/${slug}` },
  };
}

export default async function DivisionPage({ params }: PageProps) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase().trim();
  if (!isDivisionSlug(normalizedSlug)) notFound();
  const division = DIVISIONS[normalizedSlug];

  return (
    <DivisionPageTemplate
      divisionSlug={normalizedSlug}
      divisionName={division.name}
      divisionQuote={division.divsionQuote}
      divisionDescription={division.description}
      patchImagePath={division.patchImagePath}
      patchAlt={division.patchAlt}
    >
      <section aria-labelledby="specialties-heading">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground-muted">Find your specialty</p>
            <h2 id="specialties-heading" className="mb-3 text-3xl font-bold text-white sm:text-4xl">Inside {division.name}</h2>
            <p className="text-base leading-relaxed text-foreground-muted">Explore each unit&apos;s role, then meet the Dragoons assigned to it.</p>
          </div>
          <Link href={`/divisions/${normalizedSlug}/members`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-3 rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-steel-light hover:bg-steel-dark/30 focus-visible:outline-white">
            <Users size={17} aria-hidden="true" />All {division.name} profiles<ArrowRight size={17} aria-hidden="true" />
          </Link>
        </header>
        <div className={styles.cards}>
          {DIVISION_SPECIALTIES[normalizedSlug].map((unit) => (
            <article key={unit.slug} className={`${styles.card} flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]`}>
              <div className={`${styles.patch} bg-background-elevated/50`}>
                <SpecialtyPatch divisionSlug={normalizedSlug} src={unit.patchImagePath} alt={unit.patchAlt} />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="mb-2 text-xs font-mono uppercase tracking-[0.14em] text-foreground-muted">{unit.focus}</p>
                <h3 className="mb-3 text-2xl font-bold text-white">{unit.title}</h3>
                <p className="mb-6 text-sm leading-relaxed text-foreground-muted">{unit.description}</p>
                <Link href={`/divisions/${normalizedSlug}/units/${unit.slug}`} aria-label={`View assigned ${unit.title} profiles`}
                  className="mt-auto inline-flex min-h-11 items-center justify-between gap-3 rounded-md border border-white/20 px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-steel-light hover:bg-steel-dark/30 focus-visible:outline-white">
                  View assigned profiles<ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </DivisionPageTemplate>
  );
}

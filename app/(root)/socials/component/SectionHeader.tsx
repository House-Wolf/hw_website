interface SectionHeaderProps {
  id: string;
  kicker: string;
  title: string;
  subtitle?: string;
}

/** Shared hierarchy for the official channels and community creators. */
export function SectionHeader({ id, kicker, title, subtitle }: SectionHeaderProps) {
  return (
    <header className="mb-6 max-w-2xl">
      <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-foreground-muted">{kicker}</p>
      <h2 id={id} className="text-3xl font-bold text-white sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base leading-relaxed text-foreground-muted">{subtitle}</p>}
    </header>
  );
}

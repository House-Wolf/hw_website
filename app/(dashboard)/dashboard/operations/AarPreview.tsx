"use client";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { aarSections, validAarBanner } from "@/lib/command/aarPresentation.js";

export type AarContext = { title: string; brief: string; bannerUrl: string | null; visibility?: string };
export default function AarPreview({ context, summary, finalized, totals, unsaved }: { context: AarContext; summary: string; finalized: boolean; totals: { present: number; absent: number; excused: number }; unsaved: boolean }) {
  const section = aarSections({ ...context, summary });
  return <details className="dash-panel space-y-3" open>
    <summary className="cursor-pointer font-semibold">Discord post preview</summary>
    <p className="text-xs text-foreground-muted">{unsaved ? "Previewing unsaved report text. Save it before approving and sending." : "Preview of your saved report. Approval sends it to the configured AAR channel."} Discord spacing may vary.</p>
    {context.visibility !== "GUILD" && <p className="dash-notice text-sm">This operation is private. Its report cannot be posted to a Discord channel.</p>}
    <article className="mx-auto max-w-2xl space-y-1" aria-label="Discord AAR message preview">
      {validAarBanner(context.bannerUrl) && <Image unoptimized src={context.bannerUrl!} alt={`${context.title} operation banner`} width={1280} height={512} className="h-auto w-full rounded-lg" />}
      <div className="space-y-5 rounded-md border-l-4 border-l-[#b4444e] bg-background-card p-5">
        <header><p className="text-xs uppercase tracking-widest text-foreground-muted">House Wolf · After-action report</p><h4 className="mt-2 text-xl font-semibold">{section.title}</h4></header>
        {section.brief && <section><h5 className="mb-2 font-semibold">Mission brief</h5><div className="space-y-2 whitespace-pre-wrap break-words text-sm [&_a]:underline [&_p]:mb-2"><ReactMarkdown>{section.brief}</ReactMarkdown></div></section>}
        <section><h5 className="mb-2 font-semibold">After-action report</h5>{section.summary ? <div className="space-y-2 whitespace-pre-wrap break-words text-sm [&_a]:underline [&_p]:mb-2 [&_ul]:list-inside [&_ul]:list-disc"><ReactMarkdown>{section.summary}</ReactMarkdown></div> : <p className="text-sm text-foreground-muted">Write your report above to preview it here.</p>}</section>
        {finalized && <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">{[["Present", totals.present], ["Absent", totals.absent], ["Excused", totals.excused]].map(([label, value]) => <div key={label}><dt className="text-foreground-muted">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>}
        <p className="border-t border-border-default pt-3 text-sm text-foreground-muted">{section.truncated ? "Read the full approved report ↗" : "View operation & full report ↗"}</p>
      </div>
    </article>
    {section.truncated && <p className="text-xs text-foreground-muted">Discord shows an excerpt. The operation link opens the complete report on the website.</p>}
  </details>;
}

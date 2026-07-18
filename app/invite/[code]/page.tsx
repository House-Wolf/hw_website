import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  Clock3,
  ExternalLink,
} from "lucide-react";
import {
  DIVISION_BRIEFS,
  DRAGOON_PILLARS,
  getInvitation,
  getInvitationLetter,
} from "@/lib/invitations";

type InvitePageProps = {
  params: Promise<{ code: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: InvitePageProps): Promise<Metadata> {
  const { code } = await params;
  const invitation = getInvitation(code);

  return {
    metadataBase: new URL("https://housewolf.co"),
    title: `${invitation.reference} | House Wolf Invitation`,
    description: `Formal House Wolf invitation issued to ${invitation.rsiHandle}.`,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    alternates: {
      canonical: `https://housewolf.co/invite/${invitation.code}`,
    },
    openGraph: {
      title: "Invitation to the Pack",
      description: `House Wolf Command invitation for ${invitation.rsiHandle}.`,
      url: `https://housewolf.co/invite/${invitation.code}`,
      siteName: "House Wolf",
      images: [
        {
          url: `/api/og/invite?code=${invitation.code}`,
          width: 1200,
          height: 630,
          alt: "House Wolf — Invitation to the Pack",
        },
      ],
      type: "website",
    },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const invitation = getInvitation(code);
  const letter = getInvitationLetter(invitation);
  const conciseLetter = [
    letter[0],
    letter[1],
    letter[2],
    letter[3],
    "Accept this invitation, report to command, and take your place among the Dragoons.",
    "This is the way.",
  ];

  const inviteDetails = [
    { label: "Issued to", value: invitation.citizenName },
    { label: "RSI handle", value: invitation.rsiHandle },
    { label: "Reference", value: invitation.reference },
    { label: "Stardate", value: invitation.issuedAt },
  ];

  return (
    <main className="invite-root relative min-h-screen overflow-hidden">
      <style>{`
        .invite-root {
          background:
            radial-gradient(circle at 18% 10%, rgba(71, 0, 0, 0.26), transparent 34%),
            radial-gradient(circle at 82% 12%, rgba(17, 78, 98, 0.24), transparent 34%),
            linear-gradient(180deg, #020607 0%, #070b0c 58%, #020607 100%);
          color: #e8e8e8;
        }

        .invite-background {
          opacity: 0.08;
          filter: brightness(0.28) contrast(1.2) saturate(0.95);
        }

        .invite-grid {
          background-image:
            linear-gradient(rgba(96, 210, 230, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(96, 210, 230, 0.055) 1px, transparent 1px);
          background-size: 82px 82px;
          mask-image: linear-gradient(to bottom, transparent, black 10%, black 92%, transparent);
        }

        .invite-shell {
          background:
            linear-gradient(135deg, rgba(13, 21, 23, 0.98), rgba(2, 6, 7, 0.99)),
            #0d1517;
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow:
            0 38px 120px rgba(0, 0, 0, 0.68),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .invite-panel {
          background: rgba(2, 6, 7, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #e8e8e8;
        }

        .invite-letter {
          background:
            linear-gradient(180deg, rgba(9, 23, 30, 0.92), rgba(7, 11, 12, 0.96)),
            #070b0c;
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .invite-divider {
          background: linear-gradient(90deg, transparent, rgba(96, 210, 230, 0.55), rgba(138, 0, 0, 0.65), transparent);
        }

        .invite-crest {
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 0 26px rgba(17, 78, 98, 0.9)) drop-shadow(0 0 22px rgba(138, 0, 0, 0.82));
        }

        .invite-crest-aura::before {
          content: "";
          position: absolute;
          inset: -1.2rem;
          border-radius: 999px;
          background:
            radial-gradient(circle, rgba(138, 0, 0, 0.5) 0%, rgba(138, 0, 0, 0.24) 31%, transparent 66%),
            radial-gradient(circle, rgba(96, 210, 230, 0.34) 0%, rgba(17, 78, 98, 0.18) 42%, transparent 72%);
          filter: blur(18px);
          opacity: 0.58;
          transform: scale(0.92);
          animation: wolf-breath 6.4s ease-in-out infinite;
        }

        @keyframes wolf-breath {
          0%,
          100% {
            opacity: 0.42;
            transform: scale(0.9);
          }
          34% {
            opacity: 0.92;
            transform: scale(1.08);
          }
          47% {
            opacity: 0.62;
            transform: scale(0.99);
          }
          61% {
            opacity: 0.86;
            transform: scale(1.05);
          }
          82% {
            opacity: 0.5;
            transform: scale(0.94);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .invite-crest-aura::before {
            animation: none;
          }
        }

        .invite-soft {
          color: #d7e1e3;
        }

        .invite-muted {
          color: #9ca9ad;
        }

        .invite-action-button {
          min-height: 3.75rem;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 900;
          text-transform: uppercase;
          color: #ffffff;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, filter 180ms ease;
        }

        .invite-action-button:hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
        }

        .invite-action-rsi {
          background: linear-gradient(135deg, #a40000 0%, #6b0000 46%, #2a0000 100%);
          border: 1px solid rgba(255, 190, 190, 0.72);
          box-shadow: 0 0 28px rgba(138, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .invite-action-rsi:hover {
          border-color: rgba(255, 255, 255, 0.92);
          box-shadow: 0 0 38px rgba(180, 0, 0, 0.74), inset 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        .invite-action-discord {
          background: linear-gradient(135deg, #6f7cff 0%, #5865f2 44%, #1d2a8f 100%);
          border: 1px solid rgba(220, 225, 255, 0.78);
          box-shadow: 0 0 28px rgba(88, 101, 242, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .invite-action-discord:hover {
          border-color: rgba(255, 255, 255, 0.96);
          box-shadow: 0 0 38px rgba(88, 101, 242, 0.78), inset 0 1px 0 rgba(255, 255, 255, 0.26);
        }
      `}</style>

      <div className="absolute inset-0">
        <Image
          src="/images/global/SentinelWolfBoomTube.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="invite-background object-cover"
        />
        <div className="absolute inset-0 bg-[#020607]/88" />
        <div className="invite-grid absolute inset-0" aria-hidden="true" />
      </div>

      <section className="relative z-10 flex min-h-screen items-center px-4 py-6 md:px-8 md:py-8">
        <div className="invite-shell mx-auto w-full max-w-[1480px] rounded-[8px] p-4 md:p-6 xl:p-8">
          <div className="grid gap-5">
            <article className="invite-letter relative overflow-hidden rounded-[8px] p-5 md:p-7">
              <div className="absolute right-0 top-0 h-28 w-1/2 bg-gradient-to-l from-cyan-200/8 to-transparent" />
              <div className="absolute bottom-0 left-0 h-28 w-1/2 bg-gradient-to-r from-red-900/18 to-transparent" />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="mx-auto flex w-36 shrink-0 justify-center lg:mx-0">
                  <div className="invite-crest-aura relative flex h-36 w-36 items-center justify-center">
                    <Image
                      src="/images/global/HWiconnew.png"
                      alt="House Wolf crest"
                      width={144}
                      height={144}
                      priority
                      className="invite-crest h-auto w-32 md:w-36"
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs uppercase text-cyan-100">
                    House Wolf Command / Kamposian Dragoon Mercenaries
                  </p>
                  <h1 className="mt-2 text-3xl font-black uppercase leading-tight text-white md:text-5xl">
                    Invitation to the Pack
                  </h1>
                  <div className="invite-divider my-4 h-px" />
                  <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {inviteDetails.map((detail) => (
                      <div
                        key={detail.label}
                        className="border-l border-red-400/45 pl-3"
                      >
                        <div className="invite-muted font-mono text-[10px] uppercase">
                          {detail.label}
                        </div>
                        <div className="mt-1 break-words text-sm font-semibold text-white">
                          {detail.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4 text-sm leading-7 text-[#d7e1e3] md:text-base">
                    {conciseLetter.map((paragraph, index) => (
                      <p
                        key={paragraph}
                        className={
                          index === 0
                            ? "mt-3 border-l border-cyan-200/50 pl-4 text-lg font-semibold text-white"
                            : "border-l border-white/10 pl-4"
                        }
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <footer className="mt-6 grid gap-5 border-t border-white/10 pt-5 sm:grid-cols-2">
                    <div className="hidden sm:block" aria-hidden="true" />
                    <div className="border-t border-white/25 pt-3">
                      <div className="text-lg font-semibold text-white">CutterWolf</div>
                      <div className="invite-muted text-sm">
                        Clan Warlord, House Wolf
                      </div>
                    </div>
                  </footer>
                </div>
              </div>
            </article>

            <aside className="grid gap-4">
              <div className="invite-panel rounded-[8px] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase text-cyan-100">
                      The Three Pillars
                    </p>
                    <h2 className="mt-1 text-xl font-black uppercase text-white">
                      Dragoon Code
                    </h2>
                  </div>
                  {invitation.expiresAt && (
                    <div className="rounded-[8px] border border-amber-200/25 bg-black/35 px-3 py-2 text-right">
                      <div className="invite-muted flex items-center gap-2 font-mono text-[10px] uppercase">
                        <Clock3 className="h-3.5 w-3.5 text-amber-200" />
                        Expires
                      </div>
                      <div className="mt-1 text-xs font-semibold text-amber-100">
                        {invitation.expiresAt}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {DRAGOON_PILLARS.map((pillar) => (
                    <div
                      key={pillar.name}
                      className="rounded-[8px] border border-white/10 bg-black/34 p-4"
                    >
                      <div className="mb-4 flex justify-center">
                        <Image
                          src={pillar.iconPath}
                          alt={`${pillar.name} pillar`}
                          width={64}
                          height={64}
                          className="h-16 w-16 object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-center font-black uppercase text-white">
                          {pillar.name}
                        </div>
                        <div className="text-xs font-semibold uppercase text-red-200/85">
                          {pillar.creed}
                        </div>
                        <p className="invite-soft mt-1 text-xs leading-5">
                          {pillar.summary}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </aside>
          </div>

          <section className="mt-5 border-t border-white/10 pt-5">
            <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
              <div>
                <p className="font-mono text-xs uppercase text-red-200/85">
                  Invitation annex
                </p>
                <h2 className="text-2xl font-black uppercase text-white">
                  Operational Commands
                </h2>
              </div>
              <p className="invite-soft max-w-2xl text-sm">
                Your skills may find purpose within one of House Wolf&apos;s commands.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {DIVISION_BRIEFS.map((division) => (
                <div
                  key={division.code}
                  className={`relative overflow-hidden rounded-[8px] border bg-gradient-to-br p-4 ${division.glowClass}`}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={division.patchImagePath}
                      alt={`${division.code} patch`}
                      width={58}
                      height={58}
                      className="h-14 w-14 object-contain"
                    />
                    <div>
                      <h3 className="font-black uppercase text-white">
                        {division.code}
                      </h3>
                      <p className="invite-soft text-xs">{division.title}</p>
                    </div>
                  </div>
                  <p className="invite-soft mt-3 text-xs leading-5">
                    {division.summary}
                  </p>
                  <div className="mt-3 border-t border-white/10 pt-3 text-xs italic leading-5 text-cyan-100">
                    &ldquo;{division.quote}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
            <a
              href={invitation.rsiOrgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="invite-action-button invite-action-rsi"
            >
              <SpectrumMark className="h-6 w-6" />
              Join the Pack
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={invitation.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="invite-action-button invite-action-discord"
            >
              <DiscordMark className="h-6 w-6" />
              Join our Discord
              <ExternalLink className="h-4 w-4" />
            </a>
          </footer>
        </div>
      </section>
    </main>
  );
}

function SpectrumMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9 20.5 16 6l7 14.5-7-3.2-7 3.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M12 23h8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10.2 9.4c1.7-.8 3.5-1.2 5.8-1.2s4.1.4 5.8 1.2c1.8 2.6 2.6 5.5 2.4 8.8-1.6 1.2-3.2 1.9-4.9 2.3l-1-1.7c.6-.2 1.1-.4 1.6-.8-1.2.6-2.5.9-3.9.9s-2.7-.3-3.9-.9c.5.4 1 .6 1.6.8l-1 1.7c-1.7-.4-3.3-1.1-4.9-2.3-.2-3.3.6-6.2 2.4-8.8Z"
        fill="currentColor"
      />
      <circle cx="13" cy="15.2" r="1.4" fill="#fff" />
      <circle cx="19" cy="15.2" r="1.4" fill="#fff" />
    </svg>
  );
}

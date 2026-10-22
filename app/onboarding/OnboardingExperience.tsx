"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCheck, ChevronRight, Crosshair, Gamepad2, Gem, LoaderCircle, LockKeyhole, Pickaxe, Radar, ShieldCheck, Truck } from "lucide-react";
import { ONBOARDING_INTERESTS, ONBOARDING_RULES, ONBOARDING_RULES_VERSION, validateOnboardingChoices } from "@/lib/onboarding";
import { ONBOARDING_RESUME_KEY, readOnboardingResume } from "@/lib/onboardingResume";
import styles from "./onboarding.module.css";

const icons = { crosshair: Crosshair, truck: Truck, radar: Radar, pickaxe: Pickaxe, gem: Gem };
const draftKey = "housewolf-onboarding-v1";

export default function OnboardingExperience() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<"interests" | "rules" | "complete">("interests");
  const [interests, setInterests] = useState<string[]>([]);
  const [otherGameSelected, setOtherGameSelected] = useState(false);
  const [otherGame, setOtherGame] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needsJoin, setNeedsJoin] = useState(false);
  const [resumePending, setResumePending] = useState(false);
  const resumeStarted = useRef(false);
  const [discordUrl, setDiscordUrl] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const hasMoved = useRef(false);
  const ready = (interests.length > 0 || otherGameSelected) && (!otherGameSelected || otherGame.trim().length > 0);
  const selectionCount = interests.length + Number(otherGameSelected && Boolean(otherGame.trim()));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinFailed = params.get("error") === "discord_join_failed";
    if (joinFailed) {
      setNeedsJoin(true);
      setError("We couldn't add you to Discord. Please retry connecting, or contact a moderator if the problem continues.");
    }
    try {
      const stored = localStorage.getItem(draftKey);
      const draft = stored ? validateOnboardingChoices(JSON.parse(stored)) : null;
      if (draft) {
        setInterests(draft.interests);
        setOtherGame(draft.otherGame);
        setOtherGameSelected(draft.otherGameSelected);
        if (params.get("connected") === "1" || joinFailed) setStep("rules");
      }
      if (params.get("connected") === "1" && !joinFailed) {
        const resume = readOnboardingResume(sessionStorage.getItem(ONBOARDING_RESUME_KEY));
        sessionStorage.removeItem(ONBOARDING_RESUME_KEY);
        if (resume) {
          setInterests(resume.interests);
          setOtherGame(resume.otherGame);
          setOtherGameSelected(resume.otherGameSelected);
          setAccepted(true);
          setStep("rules");
          setResumePending(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (hasMoved.current) heading.current?.focus();
    hasMoved.current = true;
  }, [step]);

  const saveDraft = useCallback(() => {
    try { localStorage.setItem(draftKey, JSON.stringify({ interests, otherGame, otherGameSelected })); } catch {}
  }, [interests, otherGame, otherGameSelected]);

  const finish = useCallback(async () => {
    if (!accepted || !ready || saving || status === "loading") return;
    saveDraft();
    if (!session?.user || needsJoin) {
      setSaving(true);
      setError("");
      try {
        try {
          sessionStorage.setItem(ONBOARDING_RESUME_KEY, JSON.stringify({ interests, otherGame, otherGameSelected, rulesAccepted: true, rulesVersion: ONBOARDING_RULES_VERSION, rulesAcceptedAt: Date.now() }));
        } catch {}
        await signIn("discord", { redirectTo: "/onboarding?connected=1" }, {
          scope: "identify email guilds guilds.members.read guilds.join",
        });
      } catch {
        setError("We couldn't connect to Discord. Please try again.");
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests, otherGame, otherGameSelected, rulesAccepted: true, rulesVersion: ONBOARDING_RULES_VERSION }),
      });
      const result = await response.json();
      if (result.code === "membership_required") setNeedsJoin(true);
      if (!response.ok) throw new Error(result.error || "We couldn’t complete onboarding. Please try again.");
      setDiscordUrl(result.discordUrl);
      try { localStorage.removeItem(draftKey); } catch {}
      setStep("complete");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "We couldn’t complete onboarding. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [accepted, ready, saving, status, saveDraft, session, needsJoin, interests, otherGame, otherGameSelected]);

  useEffect(() => {
    if (!resumePending || status !== "authenticated" || !accepted || !ready || saving || resumeStarted.current) return;
    resumeStarted.current = true;
    setResumePending(false);
    void finish();
  }, [resumePending, status, accepted, ready, saving, finish]);

  useEffect(() => {
    if (step !== "complete" || !discordUrl) return;
    const redirect = window.setTimeout(() => window.location.assign(discordUrl), 1500);
    return () => window.clearTimeout(redirect);
  }, [step, discordUrl]);

  return (
    <main className={styles.experience}>
      <div className={styles.backdrop} aria-hidden="true" />
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="House Wolf home">
          <Image src="/images/global/HWiconnew.png" alt="" width={44} height={44} priority />
          <span>HOUSE WOLF<small>HOME OF THE DRAGOONS</small></span>
        </Link>
        <span className={styles.topline}><span /> YOUR NEXT CHAPTER STARTS HERE</span>
        <Link href="/" className={styles.exit}>Back to base <ArrowRight size={14} /></Link>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <span className={styles.eyebrow}>HOUSE WOLF / WELCOME ABOARD</span>
          <div className={styles.insignia}><Image src="/images/global/HWiconnew.png" alt="House Wolf emblem" width={180} height={180} priority /></div>
          <p className={styles.motto}>STRENGTH, HONOR, DEATH</p>
          <h2>Your oath.<br />Our <em>banner.</em></h2>
          <p className={styles.intro}>Take your place among the Dragoons. Honor your contracts, stand with your clan, and forge your legacy across the ’Verse.</p>
          <ol className={styles.steps} aria-label="Onboarding progress">
            <li className={step === "interests" ? styles.currentStep : styles.finishedStep} aria-current={step === "interests" ? "step" : undefined}>
              <span>{step === "interests" ? "01" : <Check size={16} />}</span><div>Find your calling<small>Tell us what brings you here</small></div>
            </li>
            <li className={step === "rules" ? styles.currentStep : step === "complete" ? styles.finishedStep : ""} aria-current={step === "rules" ? "step" : undefined}>
              <span>{step === "complete" ? <Check size={16} /> : "02"}</span><div>Know the code<small>A few rules. A stronger pack.</small></div>
            </li>
          </ol>
          <div className={styles.sidebarFooter}><ShieldCheck size={17} /><span>More than a crew.<br /><strong>A community worth fighting for.</strong></span></div>
        </aside>

        <section className={styles.panel} aria-label="House Wolf onboarding">
          <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: step === "interests" ? "50%" : "100%" }} /></div>
          <div className={styles.panelContent}>
            <div className={styles.sectionMeta}><span>{step === "complete" ? "WELCOME TO THE PACK" : `STEP ${step === "interests" ? "01" : "02"} / 02`}</span><span><LockKeyhole size={12} /> {step === "complete" ? "ONBOARDING COMPLETE" : "YOUR HOUSE WOLF JOURNEY"}</span></div>

            {step === "interests" && <>
              <div className={styles.headingRow}><div><span className={styles.kicker}>EVERY DRAGOON HAS A CALLING</span><h1 ref={heading} tabIndex={-1}>What’s your calling,<br className={styles.mobileBreak} /> mercenary?</h1></div><Crosshair className={styles.headingIcon} size={42} strokeWidth={1} /></div>
              <p className={styles.subtitle}>Choose your specialties. Find your squad. Answer the call of House Wolf.</p>
              <div className={styles.gameHeading}><span><span className={styles.liveDot} /> STAR CITIZEN</span><small>SELECT ALL THAT APPLY</small></div>
              <div className={styles.interestGrid}>
                {ONBOARDING_INTERESTS.map((interest, index) => {
                  const Icon = icons[interest.icon];
                  const selected = interests.includes(interest.id);
                  return <button type="button" key={interest.id} aria-pressed={selected} className={`${styles.interestCard} ${selected ? styles.selected : ""}`} onClick={() => setInterests((previous) => selected ? previous.filter((item) => item !== interest.id) : [...previous, interest.id])}>
                    <div className={styles.cardTop}><Icon size={27} strokeWidth={1.5} /><span className={styles.checkBox}>{selected && <Check size={13} strokeWidth={3} />}</span></div>
                    <span className={styles.cardCategory}>0{index + 1} / {interest.category}</span><strong>{interest.title}</strong><span className={styles.cardDescription}>{interest.description}</span>
                  </button>;
                })}
                <button type="button" aria-pressed={otherGameSelected} aria-controls="other-game-field" className={`${styles.interestCard} ${styles.otherCard} ${otherGameSelected ? styles.selected : ""}`} onClick={() => setOtherGameSelected(!otherGameSelected)}>
                  <div className={styles.cardTop}><Gamepad2 size={27} strokeWidth={1.5} /><span className={styles.checkBox}>{otherGameSelected && <Check size={13} strokeWidth={3} />}</span></div>
                  <span className={styles.cardCategory}>BEYOND THE ’VERSE</span><strong>Another game?</strong><span className={styles.cardDescription}>The pack plays beyond the stars. Tell us where else you roam.</span>
                </button>
              </div>
              {otherGameSelected && <div className={styles.otherField} id="other-game-field"><label htmlFor="other-game">What else are you playing?</label><input id="other-game" value={otherGame} onChange={(event) => setOtherGame(event.target.value)} maxLength={100} placeholder="e.g. Arma Reforger, DayZ, or something new…" /><span>Keep your Star Citizen picks too, or choose another game on its own.</span></div>}
              <p className={styles.selectionHint} aria-live="polite">{selectionCount ? <><CheckCheck size={15} /> {selectionCount} {selectionCount === 1 ? "interest" : "interests"} selected. There’s room for more than one calling.</> : <>Choose at least one interest or tell us about another game.</>}</p>
            </>}

            {step === "rules" && <>
              <div className={styles.headingRow}><div><span className={styles.kicker}>ONE BANNER. A SHARED CODE.</span><h1 ref={heading} tabIndex={-1}>Honor the code.<br />Uphold the oath.</h1></div><ShieldCheck className={styles.headingIcon} size={44} strokeWidth={1} /></div>
              <p className={styles.subtitle}>A mercenary’s word is their bond. Read the House Wolf code and pledge to stand by your fellow Dragoons, on and off the battlefield.</p>
              <div className={styles.rules}>{ONBOARDING_RULES.map((rule, index) => <article className={styles.rule} key={rule.label}><span className={styles.ruleNumber}>0{index + 1}</span><div><span className={styles.ruleLabel}>{rule.label}</span><h2>{rule.title}</h2><p>{rule.text}</p></div></article>)}</div>
              <label className={`${styles.acceptance} ${accepted ? styles.accepted : ""}`}><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span><strong>I’ve read the rules. I’m ready to stand with the pack.</strong><small>I agree to follow these rules while taking part in House Wolf.</small></span></label>
              {(!session?.user || needsJoin) && <p className={styles.signInNote}><LockKeyhole size={14} /> Connect Discord to join House Wolf. After authorization, onboarding will finish and open Discord automatically. Already a member? You can use the same button. Your interests stay saved on this device.</p>}
            </>}

            {step === "complete" && <div className={styles.completion}><div className={styles.completionIcon}><ShieldCheck size={46} strokeWidth={1.3} /></div><span className={styles.kicker}>YOUR NEXT CHAPTER</span><h1 ref={heading} tabIndex={-1}>Welcome to<br />House Wolf.</h1><p>Your Visitor role is ready. Your interests are saved.<br />Opening Discord? Watch general chat for your welcome to the pack.</p><a className={styles.primaryButton} href={discordUrl}>Return to Discord <ArrowRight size={17} /></a><Link href="/dashboard" className={styles.dashboardLink}>Explore your dashboard <ChevronRight size={14} /></Link></div>}

            {error && <div className={styles.error} role="alert">{error}</div>}
          </div>
          {step !== "complete" && <footer className={styles.panelFooter}><div>{step === "rules" ? <button type="button" className={styles.backButton} disabled={saving} onClick={() => { setStep("interests"); setError(""); }}><ArrowLeft size={16} /> Back</button> : <span className={styles.footerNote}>YOUR STORY. YOUR CALLING.</span>}</div><button type="button" className={styles.primaryButton} disabled={step === "interests" ? !ready : !accepted || saving || status === "loading"} onClick={() => { if (step === "interests") { saveDraft(); setStep("rules"); } else { void finish(); } }}>{saving ? <><LoaderCircle className={styles.spinner} size={17} /> Finishing up…</> : step === "interests" ? <>Continue <ArrowRight size={17} /></> : <>{session?.user && !needsJoin ? "Join the pack" : "Connect Discord & join"} <ArrowRight size={17} /></>}</button></footer>}
        </section>
      </div>
      <footer className={styles.pageFooter}><span>HOUSE WOLF <span aria-hidden="true">/</span> EST. 2951</span><span>STRONGER TOGETHER. ALWAYS.</span></footer>
    </main>
  );
}

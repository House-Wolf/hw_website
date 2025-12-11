"use client";

import { JSX } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import CardComponent from "@/components/utils/CardComponent";

/**
 * @component DragoonCodePage - The Dragoon Code page component for House Wolf Dragoons website.
 * @description This component renders the Dragoon Code page, detailing the warrior creed of Strength, Honor, and Death, along with the Three Pillars and Resol'nare principles.
 * @returns {JSX.Element} The rendered Dragoon Code page.
 * @author House Wolf Dev Team
 */
export default function DragoonCodePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-linear-to-b from-shadow via-obsidian to-night-deep">
      <PageHeader
        title="The Dragoon Code"
        subtitle="A warrior culture centered on armor, weapons, and war"
        iconSrc="/images/global/HWiconnew.png"
      />

      {/* Main Code Statement */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-obsidian to-night-midnight">
        <div className="max-w-7xl mx-auto">
          <div className="bg-linear-to-br from-crimson-dark/20 via-steel-dark/10 to-obsidian border-2 border-accent-main rounded-lg p-8 sm:p-10 md:p-12 lg:p-16 shadow-[0_0_50px_rgba(71,0,0,0.3)]">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-10 md:mb-12 text-crimson tracking-widest uppercase">
              Code of Honor
            </h2>
            <div className="space-y-8 sm:space-y-10 text-center">
              <div className="group">
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 group-hover:text-crimson-light transition-colors duration-300">
                  Strength is life,
                </p>
                <p className="text-base sm:text-lg md:text-xl text-foreground-muted italic">
                  for the strong have the right to rule
                </p>
              </div>

              <div className="h-px w-3/4 mx-auto bg-linear-to-r from-transparent via-steel to-transparent" />

              <div className="group">
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 group-hover:text-steel-light transition-colors duration-300">
                  Honor is life,
                </p>
                <p className="text-base sm:text-lg md:text-xl text-foreground-muted italic">
                  for with no honor one may as well be dead
                </p>
              </div>

              <div className="h-px w-3/4 mx-auto bg-linear-to-r from-transparent via-steel to-transparent" />

              <div className="group">
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 group-hover:text-crimson-light transition-colors duration-300">
                  Death is life,
                </p>
                <p className="text-base sm:text-lg md:text-xl text-foreground-muted italic">
                  one should die as they have lived
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section
        id="three-pillars"
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-night-midnight to-obsidian"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-14 md:mb-16 text-crimson-light tracking-widest uppercase">
            The Three Pillars
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid gap-8 md:grid-cols-3">
              {/* Strength */}
              <CardComponent
                title="Strength"
                image="/images/code/strength.png"
                borderColor="border-crimson"
                linearFrom="from-crimson-dark"
                linearTo="to-obsidian"
                hoverShadow="hover:shadow-[0_12px_40px_rgba(17,78,98,0.5)]"
                titleColor=""
              >
                <>
                  <p className="text-foreground-muted leading-relaxed mb-4">
                    The right to rule belongs to the strong. Those who possess
                    superior strength have earned the authority to lead and
                    shape the destiny of others.
                  </p>
                  <p className="text-foreground-muted leading-relaxed">
                    When Dragoons encounter those weaker, they have the
                    right—and duty—to bring them into the fold, sharing the
                    Dragoon way of life through conquest and integration.
                  </p>
                </>
              </CardComponent>

              {/* Honor */}
              <CardComponent
                title="Honor"
                image="/images/code/honor.png"
                borderColor="border-steel"
                linearFrom="from-steel-dark"
                linearTo="to-obsidian"
                hoverShadow="hover:shadow-[0_12px_40px_rgba(17,78,98,0.5)]"
                titleColor=""
              >
                <>
                  <p className="text-foreground-muted leading-relaxed mb-4">
                    Honor defines existence itself. A life without honor is no
                    life at all—merely an empty shell devoid of meaning or
                    purpose.
                  </p>
                  <p className="text-foreground-muted leading-relaxed">
                    Every action, every decision, every battle must be
                    conducted with unwavering honor. It is the soul of the
                    Dragoon warrior and the measure by which all are judged.
                  </p>
                </>
              </CardComponent>

              {/* Death */}
              <CardComponent
                title="Death"
                image="/images/code/death.png"
                borderColor="border-crimson"
                linearFrom="from-crimson-dark"
                linearTo="to-obsidian"
                hoverShadow="hover:shadow-[0_12px_40px_rgba(17,78,98,0.5)]"
                titleColor=""
              >
                <>
                  <p className="text-foreground-muted leading-relaxed mb-4">
                    Death is not the end, but the ultimate expression of how
                    one has lived. The manner of death matters far more than
                    death itself.
                  </p>
                  <p className="text-foreground-muted leading-relaxed">
                    A Dragoon who dies with strength and honor achieves an
                    acceptable death—one that upholds the Code and serves as
                    an example for all who remain.
                  </p>
                </>
              </CardComponent>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Resol'nare Section */}
      <section
        id="resolnare"
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-obsidian via-night-deep to-shadow"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-14 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-steel-light mb-4 tracking-widest uppercase">
              The Resol&apos;nare
            </h2>
            <p className="text-lg sm:text-xl text-foreground-muted italic">
              Six Sacred Principles That Define A Dragoon
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Principle 1 */}
            <div className="group bg-linear-to-br from-steel-dark/20 to-obsidian border border-accent-main rounded-lg p-6 hover:border-steel-light hover:shadow-[0_0_30px_rgba(17,78,98,0.3)] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-linear-to-br from-steel to-steel-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-steel-light mb-2">
                    Raise Children as Dragoons
                  </h3>
                  <p className="text-sm sm:text-base text-foreground-muted">
                    Pass down the warrior culture, traditions, and values to the
                    next generation, ensuring the eternal continuation of the
                    Dragoon way of life.
                  </p>
                </div>
              </div>
            </div>

            {/* Principle 2 */}
            <div className="group bg-linear-to-br from-crimson-dark/20 to-obsidian border border-accent-main rounded-lg p-6 hover:border-steel-light hover:shadow-[0_0_30px_rgba(17,78,98,0.3)] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-linear-to-br from-crimson to-crimson-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-crimson-light mb-2">
                    Wear the Dragoon Armor
                  </h3>
                  <p className="text-sm sm:text-base text-foreground-muted">
                    Don the sacred armor that symbolizes our identity and
                    heritage. The armor is more than protection—it is a
                    statement of who we are.
                  </p>
                </div>
              </div>
            </div>

            {/* Principle 3 */}
            <div className="group bg-linear-to-br from-steel-dark/20 to-obsidian border border-accent-main rounded-lg p-6 hover:border-steel-light hover:shadow-[0_0_30px_rgba(17,78,98,0.3)] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-linear-to-br from-steel to-steel-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-steel-light mb-2">
                    Master Self-Defense
                  </h3>
                  <p className="text-sm sm:text-base text-foreground-muted">
                    Continuously hone combat skills and tactical prowess. A
                    Dragoon must be capable of defending themselves and their
                    clan at all times.
                  </p>
                </div>
              </div>
            </div>

            {/* Principle 4 */}
            <div className="group bg-linear-to-br from-crimson-dark/20 to-obsidian border border-accent-main rounded-lg p-6 hover:border-steel-light hover:shadow-[0_0_30px_rgba(17,78,98,0.3)] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-linear-to-br from-crimson to-crimson-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-crimson-light mb-2">
                    Devote Yourself to the Clan
                  </h3>
                  <p className="text-sm sm:text-base text-foreground-muted">
                    Put the welfare of House Wolf above personal gain. The
                    clan&apos;s prosperity and survival depend on each member&apos;s
                    unwavering dedication.
                  </p>
                </div>
              </div>
            </div>

            {/* Principle 5 */}
            <div className="group bg-linear-to-br from-steel-dark/20 to-obsidian border border-accent-main rounded-lg p-6 hover:border-steel-light hover:shadow-[0_0_30px_rgba(17,78,98,0.3)] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-linear-to-br from-steel to-steel-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-steel-light mb-2">
                    Speak the Dragoon Language
                  </h3>
                  <p className="text-sm sm:text-base text-foreground-muted">
                    Preserve and use the sacred tongue that binds all Dragoons
                    together, maintaining our unique identity and cultural
                    heritage.
                  </p>
                </div>
              </div>
            </div>

            {/* Principle 6 */}
            <div className="group bg-linear-to-br from-crimson-dark/20 to-obsidian border border-accent-main rounded-lg p-6 hover:border-steel-light hover:shadow-[0_0_30px_rgba(17,78,98,0.3)] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 bg-linear-to-br from-crimson to-crimson-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-crimson-light mb-2">
                    Answer the Call
                  </h3>
                  <p className="text-sm sm:text-base text-foreground-muted">
                    When House Wolf summons, every Dragoon must answer. Loyalty
                    and response to the clan&apos;s needs are fundamental to our
                    survival and strength.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section
        id="join-house-wolf"
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-shadow to-obsidian"
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-linear-to-br from-crimson-dark/30 via-steel-dark/20 to-obsidian border-2 border-crimson/50 rounded-lg p-8 sm:p-10 md:p-12 lg:p-14 shadow-[0_0_60px_rgba(71,0,0,0.4)]">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-crimson-light mb-6 uppercase tracking-wider">
              Walk the Path of the Dragoon
            </h2>
            <p className="text-lg sm:text-xl text-foreground-muted mb-8 leading-relaxed max-w-3xl mx-auto">
              These principles are not mere words—they are the foundation of our
              existence, the pillars upon which House Wolf stands. Live by the
              Code. Die by the Code.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="https://robertsspaceindustries.com/en/orgs/CUTTERWOLF"
                target="_blank"
                rel="noopener noreferrer"
                prefetch={false}
                className="px-8 py-4 bg-linear-to-r from-crimson to-crimson-light text-foreground font-bold rounded-lg hover:shadow-[0_0_30px_rgba(17,78,98,0.6)] transition-all duration-300 uppercase tracking-wider"
              >
                Join Our Ranks
              </Link>
              <Link
                href="/origins"
                className="px-8 py-4 bg-linear-to-r from-steel to-steel-light text-foreground font-bold rounded-lg hover:shadow-[0_0_30px_rgba(17,78,98,0.6)] transition-all duration-300 uppercase tracking-wider"
              >
                Learn Our History
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

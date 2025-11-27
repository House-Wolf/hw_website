import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function DragoonCodePage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-shadow via-obsidian to-night-deep">
      {/* Hero Section */}
      <section className="relative h-[75vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/global/Websitebgnew.png"
            alt="House Wolf Background"
            fill
            className="opacity-90 object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-b from-crimson-dark/40 via-transparent to-obsidian/90" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <div className="mb-8">
            <Image
              src="/images/global/HWiconnew.png"
              alt="House Wolf Icon"
              width={120}
              height={120}
              className="mx-auto filter drop-shadow-[0_0_30px_rgba(71,0,0,0.8)]"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-crimson-light mb-6 tracking-wider uppercase font-mono">
            The Dragoon Code
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-transparent via-crimson to-transparent mx-auto mb-8" />
          <p className="text-xl md:text-2xl text-foreground-muted italic leading-relaxed">
            A warrior culture centered on armor, weapons, and war
          </p>
        </div>
      </section>

      {/* Main Code Statement */}
      <section className="py-20 px-4 bg-linear-to-b from-obsidian to-night-midnight">
        <div className="max-w-6xl mx-auto">
          <div className="bg-linear-to-br from-crimson-dark/20 via-steel-dark/10 to-obsidian border-2 border-accent-secondary rounded-lg p-12 md:p-16 shadow-[0_0_50px_rgba(71,0,0,0.3)]">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-crimson tracking-widest uppercase">
              Code of Honor
            </h2>
            <div className="space-y-8 text-center">
              <div className="group">
                <p className="text-2xl md:text-3xl font-bold text-foreground mb-2 group-hover:text-crimson-light transition-colors duration-300">
                  Strength is life,
                </p>
                <p className="text-lg md:text-xl text-foreground-muted italic">
                  for the strong have the right to rule
                </p>
              </div>

              <div className="h-px w-3/4 mx-auto bg-gradient-to-r from-transparent via-steel to-transparent" />

              <div className="group">
                <p className="text-2xl md:text-3xl font-bold text-foreground mb-2 group-hover:text-steel-light transition-colors duration-300">
                  Honor is life,
                </p>
                <p className="text-lg md:text-xl text-foreground-muted italic">
                  for with no honor one may as well be dead
                </p>
              </div>

              <div className="h-px w-3/4 mx-auto bg-gradient-to-r from-transparent via-steel to-transparent" />

              <div className="group">
                <p className="text-2xl md:text-3xl font-bold text-foreground mb-2 group-hover:text-crimson-light transition-colors duration-300">
                  Death is life,
                </p>
                <p className="text-lg md:text-xl text-foreground-muted italic">
                  one should die as they have lived
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section className="py-20 px-4 bg-linear-to-b from-night-midnight to-obsidian">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-crimson-light tracking-widest uppercase">
            The Three Pillars
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Strength */}
            <div className="group relative bg-linear-to-br from-crimson-dark/30 to-obsidian border border-crimson/40 rounded-lg p-8 hover:border-crimson hover:shadow-[0_0_40px_rgba(71,0,0,0.4)] transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-crimson via-crimson-light to-crimson opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-lg" />

              <div className="relative mb-6 bg-linear-to-br from-obsidian to-shadow rounded-lg p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)] group-hover:shadow-[0_0_40px_rgb(255,223,0,0.4)] transition-all duration-300">
                <Image
                  src="/images/code/strength.png"
                  alt="Strength"
                  width={300}
                  height={300}
                  className="w-full h-72 object-contain rounded-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-[0_4px_20px_rgba(71,0,0,0.4)]"
                />
              </div>

              <h3 className="text-3xl font-bold text-crimson-light mb-4 uppercase tracking-wider">
                Strength
              </h3>

              <p className="text-foreground-muted leading-relaxed mb-4">
                The right to rule belongs to the strong. Those who possess
                superior strength have earned the authority to lead and shape
                the destiny of others.
              </p>

              <p className="text-foreground-muted leading-relaxed">
                When Dragoons encounter those weaker, they have the right—and
                duty—to bring them into the fold, sharing the Dragoon way of
                life through conquest and integration.
              </p>
            </div>

            {/* Honor */}
            <div className="group relative bg-linear-to-br from-steel-dark/30 to-obsidian border border-steel/40 rounded-lg p-8 hover:border-steel-light hover:shadow-[0_0_40px_rgba(17,78,98,0.4)] transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-steel via-steel-light to-steel opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-lg" />

              <div className="relative mb-6 bg-linear-to-br from-obsidian to-shadow rounded-lg p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)] group-hover:shadow-[0_12px_40px_rgba(17,78,98,0.5)] transition-all duration-300">
                <Image
                  src="/images/code/honor.png"
                  alt="Honor"
                  width={300}
                  height={300}
                  className="w-full h-72 object-contain rounded-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-[0_4px_20px_rgba(17,78,98,0.4)]"
                />
              </div>

              <h3 className="text-3xl font-bold text-steel-light mb-4 uppercase tracking-wider">
                Honor
              </h3>

              <p className="text-foreground-muted leading-relaxed mb-4">
                Honor defines existence itself. A life without honor is no life
                at all—merely an empty shell devoid of meaning or purpose.
              </p>

              <p className="text-foreground-muted leading-relaxed">
                Every action, every decision, every battle must be conducted
                with unwavering honor. It is the soul of the Dragoon warrior and
                the measure by which all are judged.
              </p>
            </div>

            {/* Death */}
            <div className="group relative bg-linear-to-br from-crimson-dark/30 to-obsidian border border-crimson/40 rounded-lg p-8 hover:border-crimson hover:shadow-[0_0_40px_rgba(71,0,0,0.4)] transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-crimson via-crimson-light to-crimson opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-lg" />

              <div className="relative mb-6 bg-linear-to-br from-obsidian to-shadow rounded-lg p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)] group-hover:shadow-[0_12px_40px_rgba(71,0,0,0.5)] transition-all duration-300">
                <Image
                  src="/images/code/death.png"
                  alt="Death"
                  width={300}
                  height={300}
                  className="w-full h-72 object-contain rounded-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-[0_4px_20px_rgba(71,0,0,0.4)]"
                />
              </div>

              <h3 className="text-3xl font-bold text-crimson-light mb-4 uppercase tracking-wider">
                Death
              </h3>

              <p className="text-foreground-muted leading-relaxed mb-4">
                Death is not the end, but the ultimate expression of how one has
                lived. The manner of death matters far more than death itself.
              </p>

              <p className="text-foreground-muted leading-relaxed">
                A Dragoon who dies with strength and honor achieves an
                acceptable death—one that upholds the Code and serves as an
                example for all who remain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resol'nare Section */}
      <section className="py-20 px-4 bg-linear-to-b from-obsidian via-night-deep to-shadow">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-steel-light mb-4 tracking-widest uppercase">
              The Resol'nare
            </h2>
            <p className="text-xl text-foreground-muted italic">
              Six Sacred Principles That Define A Dragoon
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Principle 1 */}
            <div className="group bg-linear-to-br from-steel-dark/20 to-obsidian border border-accent-main rounded-lg p-6 hover:border-steel-light hover:shadow-[0_0_30px_rgba(17,78,98,0.3)] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-linear-to-br from-steel to-steel-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300">
                </div>
                <div>
                  <h3 className="text-xl font-bold text-steel-light mb-2">
                    Raise Children as Dragoons
                  </h3>
                  <p className="text-foreground-muted">
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
                <div className="flex-shrink-0 w-12 h-12 bg-linear-to-br from-crimson to-crimson-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300">
                </div>
                <div>
                  <h3 className="text-xl font-bold text-crimson-light mb-2">
                    Wear the Dragoon Armor
                  </h3>
                  <p className="text-foreground-muted">
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
                <div className="flex-shrink-0 w-12 h-12 bg-linear-to-br from-steel to-steel-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300">
                </div>
                <div>
                  <h3 className="text-xl font-bold text-steel-light mb-2">
                    Master Self-Defense
                  </h3>
                  <p className="text-foreground-muted">
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
                <div className="flex-shrink-0 w-12 h-12 bg-linear-to-br from-crimson to-crimson-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300">
                </div>
                <div>
                  <h3 className="text-xl font-bold text-crimson-light mb-2">
                    Devote Yourself to the Clan
                  </h3>
                  <p className="text-foreground-muted">
                    Put the welfare of House Wolf above personal gain. The
                    clan's prosperity and survival depend on each member's
                    unwavering dedication.
                  </p>
                </div>
              </div>
            </div>

            {/* Principle 5 */}
            <div className="group bg-linear-to-br from-steel-dark/20 to-obsidian border border-accent-main rounded-lg p-6 hover:border-steel-light hover:shadow-[0_0_30px_rgba(17,78,98,0.3)] transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-linear-to-br from-steel to-steel-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300">
                </div>
                <div>
                  <h3 className="text-xl font-bold text-steel-light mb-2">
                    Speak the Dragoon Language
                  </h3>
                  <p className="text-foreground-muted">
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
                <div className="flex-shrink-0 w-12 h-12 bg-linear-to-br from-crimson to-crimson-light rounded-lg flex items-center justify-center text-2xl font-bold text-foreground group-hover:scale-110 transition-transform duration-300">
                </div>
                <div>
                  <h3 className="text-xl font-bold text-crimson-light mb-2">
                    Answer the Call
                  </h3>
                  <p className="text-foreground-muted">
                    When House Wolf summons, every Dragoon must answer. Loyalty
                    and response to the clan's needs are fundamental to our
                    survival and strength.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 bg-linear-to-b from-shadow to-obsidian">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-linear-to-br from-crimson-dark/30 via-steel-dark/20 to-obsidian border-2 border-crimson/50 rounded-lg p-12 shadow-[0_0_60px_rgba(71,0,0,0.4)]">
            <h2 className="text-3xl md:text-4xl font-bold text-crimson-light mb-6 uppercase tracking-wider">
              Walk the Path of the Dragoon
            </h2>
            <p className="text-xl text-foreground-muted mb-8 leading-relaxed">
              These principles are not mere words—they are the foundation of our
              existence, the pillars upon which House Wolf stands. Live by the
              Code. Die by the Code.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="https://robertsspaceindustries.com/en/orgs/CUTTERWOLF"
                className="px-8 py-4 bg-gradient-to-r from-crimson to-crimson-light text-foreground font-bold rounded-lg hover:shadow-[0_0_30px_rgba(71,0,0,0.6)] transition-all duration-300 uppercase tracking-wider"
              >
                Join Our Ranks
              </Link>
              <Link
                href="/origins"
                className="px-8 py-4 bg-gradient-to-r from-steel to-steel-light text-foreground font-bold rounded-lg hover:shadow-[0_0_30px_rgba(17,78,98,0.6)] transition-all duration-300 uppercase tracking-wider"
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

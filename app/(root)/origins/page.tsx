import { JSX } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SafeImage } from "@/components/utils/SafeImage";

/**
 * @component OriginsPage
 * @description The OriginsPage component provides a comprehensive overview of the Kamposian Dragoons' history, culture, and legacy.
 * It features multiple sections with rich content, images, and links to related topics.
 * @returns {JSX.Element} The Origins page component.
 * @author House Wolf Dev Team
 */

export default function OriginsPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-linear-to-b from-shadow via-obsidian to-night-deep">
      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-linear-to-b from-steel-dark/60 via-obsidian/40 to-obsidian/95" />
          {/* Subtle color orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crimson/20 rounded-full blur-[120px] animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-steel/20 rounded-full blur-[120px] animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>
        {/* Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-white to-transparent opacity-30 z-10" />
        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto">
          <div className="mb-8">
            <SafeImage
              src="/images/global/HWiconnew.png"
              alt="House Wolf Icon"
              width={120}
              height={120}
              className="mx-auto filter drop-shadow-[0_0_30px_rgba(17,78,98,0.8)]"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-steel-light mb-6 tracking-wider uppercase font-mono drop-shadow-[0_0_20px_rgba(17,78,98,0.8)]">
            Our Origins
          </h1>
          <div className="h-1 w-32 bg-linear-to-r from-transparent via-steel-light to-transparent mx-auto mb-8 shadow-[0_0_15px_rgba(17,78,98,0.8)]" />
          <p className="text-xl md:text-2xl text-foreground-muted italic leading-relaxed">
            The legendary history of the Kamposian Dragoons
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="relative py-20 px-4 bg-linear-to-b from-obsidian to-night-midnight overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-[radial-linear(ellipse_at_center,var(--tw-linear-stops))] from-steel/10 via-transparent to-transparent opacity-30" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="bg-linear-to-br from-steel-dark/20 via-crimson-dark/10 to-obsidian border-2 border-steel/30 rounded-lg p-8 md:p-12 shadow-[0_0_50px_rgba(17,78,98,0.4)] hover:shadow-[0_0_60px_rgba(17,78,98,0.5)] hover:border-steel/50 transition-all duration-500">
            <p className="text-xl md:text-2xl text-foreground leading-relaxed mb-6">
              The{" "}
              <span className="text-steel-light font-bold">
                Kamposian Dragoons
              </span>{" "}
              were a clan-based culture composed of members from multiple
              species and bound by a common creed, language, and code.
            </p>
            <p className="text-lg md:text-xl text-foreground-muted leading-relaxed">
              Known primarily as highly-effective mercenaries and bounty
              hunters, Kamposian Dragoons—or simply "Dragoons"—have at various
              points in galactic history played a major role as legendary
              warriors and conquerors.
            </p>
          </div>
        </div>
      </section>

      {/* Kampos Section */}
      <section className="py-20 px-4 bg-linear-to-b from-night-midnight to-obsidian">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="relative">
              <div
                className="
                    rounded-xl overflow-hidden
                    bg-linear-to-br from-steel-dark/30 to-obsidian
                    shadow-[0_0_18px_rgba(0,180,255,0.25)]
                    hover:shadow-[0_0_28px_rgba(0,200,255,0.45)]
                    transition-shadow duration-300
                  "
              >
                <SafeImage
                  src="/images/origins/kamposimagnusskull.png"
                  alt="Kampos - Birthplace of the Dragoons"
                  width={800}
                  height={600}
                  className="w-full h-80 object-contain rounded-xl"
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-steel-light mb-6 uppercase tracking-wider drop-shadow-[0_0_15px_rgba(17,78,98,0.6)]">
                Kampos
              </h2>
              <div className="h-1 w-24 bg-linear-to-r from-steel-light to-transparent mb-6 shadow-[0_0_10px_rgba(17,78,98,0.8)]" />

              <p className="text-lg text-foreground-muted leading-relaxed mb-4">
                Originating on the planet of{" "}
                <span className="text-steel-light font-semibold">
                  Kampos (Ellis IV)
                </span>
                , the Dragoons' way of life revolved around honor and war.
              </p>

              <p className="text-lg text-foreground-muted leading-relaxed mb-6">
                This harsh world forged a warrior culture unlike any other,
                where strength and honor were not mere ideals but the very
                foundation of existence.
              </p>

              <Link
                href="https://robertsspaceindustries.com/galactapedia/article/RAXxrxr7M5-kampos-ellis-iv"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-steel to-steel-light text-foreground font-bold rounded-lg hover:shadow-[0_0_30px_rgba(17,78,98,0.8)] hover:scale-105 transition-all duration-300 uppercase tracking-wider text-sm mr-4 mb-4"
              >
                <ExternalLink size={18} />
                View Galactapedia Entry
              </Link>
              <Link
                href="https://robertsspaceindustries.com/en/starmap?location=ELLIS.PLANETS.ELLISIVKAMPOS&system=ELLIS&camera=59.08,0.08,0.0004,0,0#"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-steel to-steel-light text-foreground font-bold rounded-lg hover:shadow-[0_0_30px_rgba(17,78,98,0.8)] hover:scale-105 transition-all duration-300 uppercase tracking-wider text-sm"
              >
                <ExternalLink size={18} />
                View Star Map Entry
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Expansion Section */}
      <section className="relative py-20 px-4 bg-linear-to-b from-obsidian to-night-deep overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-crimson/10 rounded-full blur-[150px] animate-pulse" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-crimson-light mb-4 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(220,38,38,0.6)]">
              The Great Expansion
            </h2>
            <p className="text-xl text-foreground-muted italic">
              From a single world to an empire
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Expansion Card 1 */}
            <div className="group bg-linear-to-br from-crimson-dark/20 to-obsidian border border-crimson/30 rounded-lg p-8 hover:border-crimson hover:shadow-[0_0_50px_rgba(220,38,38,0.5)] hover:scale-105 transition-all duration-500">
              <div className="relative mb-6 bg-linear-to-br from-obsidian to-shadow rounded-lg p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
                <SafeImage
                  src="/images/origins/wars.png"
                  alt="Wars of Expansion"
                  width={900}
                  height={700}
                  className="w-full h-64 object-contain rounded-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300 brightness-150"
                />
              </div>

              <h3 className="text-2xl font-bold text-crimson-light mb-4 uppercase tracking-wider">
                Wars of Expansion
              </h3>

              <p className="text-foreground-muted leading-relaxed">
                As a result of their warrior culture, the Dragoons launched
                several wars of expansion, colonizing nearby worlds and
                extending their influence across the sector.
              </p>
            </div>

            {/* Expansion Card 2 */}
            <div className="group bg-linear-to-br from-steel-dark/20 to-obsidian border border-steel/30 rounded-lg p-8 hover:border-steel-light hover:shadow-[0_0_50px_rgba(17,78,98,0.5)] hover:scale-105 transition-all duration-500">
              <div className="relative mb-6 bg-linear-to-br from-obsidian to-shadow rounded-lg p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
                <SafeImage
                  src="/images/origins/dragoonSpace.png"
                  alt="Dragoon Space"
                  width={900}
                  height={700}
                  className="w-full h-64 object-contain rounded-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300 brightness-150"
                />
              </div>

              <h3 className="text-2xl font-bold text-steel-light mb-4 uppercase tracking-wider">
                Dragoon Space
              </h3>

              <p className="text-foreground-muted leading-relaxed">
                The sector surrounding their homeworld became known as{" "}
                <span className="text-steel-light font-semibold">
                  Dragoon Space
                </span>
                , a testament to their military prowess and territorial
                dominance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Civil War Section */}
      <section className="relative py-20 px-4 bg-linear-to-b from-night-deep to-shadow overflow-hidden">
        {/* Dual color glows representing the divide */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crimson/20 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-steel/20 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="bg-linear-to-br from-crimson-dark/30 via-steel-dark/20 to-obsidian border-2 border-crimson/50 rounded-lg p-12 md:p-16 shadow-[0_0_70px_rgba(220,38,38,0.4)] hover:shadow-[0_0_80px_rgba(220,38,38,0.5)] transition-all duration-500">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 text-crimson-light uppercase tracking-wider drop-shadow-[0_0_25px_rgba(220,38,38,0.8)]">
              The Great Divide
            </h2>

            <div className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Traditionalists */}
                <div className="bg-linear-to-br from-crimson-dark/40 to-obsidian border border-crimson/40 rounded-lg p-6 hover:border-crimson hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all duration-300">
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-crimson-light mb-2 flex items-center gap-2">
                      <span className="w-3 h-3 bg-crimson rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse"></span>
                      Traditionalist Warriors
                    </h3>
                  </div>
                  <p className="text-foreground-muted leading-relaxed">
                    Traditional Dragoon warriors maintained control of Kampos
                    through force, upholding the ancient ways of honor through
                    combat and the warrior's code that had defined their people
                    for generations.
                  </p>
                </div>

                {/* New Dragoons */}
                <div className="bg-linear-to-br from-steel-dark/40 to-obsidian border border-steel/40 rounded-lg p-6 hover:border-steel-light hover:shadow-[0_0_30px_rgba(17,78,98,0.4)] transition-all duration-300">
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-steel-light mb-2 flex items-center gap-2">
                      <span
                        className="w-3 h-3 bg-steel-light rounded-full shadow-[0_0_10px_rgba(17,78,98,0.8)] animate-pulse"
                        style={{ animationDelay: "0.5s" }}
                      ></span>
                      The New Dragoons
                    </h3>
                  </div>
                  <p className="text-foreground-muted leading-relaxed">
                    Much of Kampos's population embraced the pacifist New
                    Dragoons movement, led by the young Duchess Satine Kryze of
                    House Kryze, seeking a path away from endless war.
                  </p>
                </div>
              </div>

              <div className="border-t border-border-subtle pt-8">
                <p className="text-xl text-foreground leading-relaxed text-center">
                  Eventually, a civil war erupted between the pacifist New
                  Dragoons and the traditionalist warriors, tearing the Dragoon
                  culture apart and reshaping the fate of Kampos forever.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Legacy Section */}
      <section className="relative py-20 px-4 bg-linear-to-b from-shadow to-obsidian overflow-hidden">
        {/* Central glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-linear-radial from-steel/20 via-crimson/10 to-transparent rounded-full blur-[100px]" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-steel-light mb-8 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(17,78,98,0.6)]">
            Our Legacy Continues
          </h2>

          <p className="text-xl text-foreground-muted mb-12 leading-relaxed max-w-3xl mx-auto">
            Today, House Wolf carries forward the proud traditions of the
            Kamposian Dragoons, honoring the warrior code while forging our own
            path among the stars.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/code"
              className="px-8 py-4 bg-linear-to-r from-crimson to-crimson-light text-foreground font-bold rounded-lg hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] hover:scale-105 transition-all duration-300 uppercase tracking-wider"
            >
              The Dragoon Code
            </Link>
            <Link
              href="/commands"
              className="px-8 py-4 bg-linear-to-r from-steel to-steel-light text-foreground font-bold rounded-lg hover:shadow-[0_0_40px_rgba(17,78,98,0.6)] hover:scale-105 transition-all duration-300 uppercase tracking-wider"
            >
              Our Commands
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

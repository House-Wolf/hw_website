import { JSX } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SafeImage } from "@/components/utils/SafeImage";
import PageHeader from "@/components/layout/PageHeader";

/**
 * @component OriginsPage
 * @description Displays the origins and history of the Kamposian Dragoons with lore sections, images, and interactive cards.
 * @returns {JSX.Element} The fully rendered Origins page.
 * @author House Wolf Dev
 */
export default function OriginsPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-b from-shadow via-obsidian to-black">
      <PageHeader
        title="Our Origins"
        subtitle="The legendary history of the Kamposian Dragoons"
        iconSrc="/images/global/HWiconnew.png"
      />
      <section className="relative py-20 px-4 bg-gradient-to-b from-obsidian to-night-midnight overflow-visible">
        {/* NEW: Fixed radial gradient syntax */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-steel/10 via-transparent to-transparent opacity-30" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="bg-gradient-to-br from-steel-dark/20 via-crimson-dark/10 to-obsidian border-2 border-steel/30 rounded-lg p-8 md:p-12 shadow-[0_0_50px_rgba(17,78,98,0.4)]">
            <p className="text-xl md:text-2xl text-foreground leading-relaxed mb-6">
              The{" "}
              <span className="text-steel-light font-bold">
                Kamposian Dragoons
              </span>{" "}
              were a clan-based culture composed of multiple species and bound
              by a common creed, language, and code.
            </p>
            <p className="text-lg md:text-xl text-foreground-muted leading-relaxed">
              Known as elite mercenaries and bounty hunters, the Dragoons shaped
              the galaxy through war, honor, and conquest.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-b from-night-midnight to-obsidian">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <div
              className="
                rounded-xl overflow-hidden
                border-2 border-steel/40
                bg-gradient-to-br from-steel-dark/30 to-obsidian
                shadow-[0_0_18px_rgba(0,180,255,0.25)]
                hover:shadow-[0_0_28px_rgba(0,200,255,0.45)]
                transition-shadow duration-300
                will-change-transform
              "
            >
              <SafeImage
                src="/images/origins/kamposimagnusskull.png"
                alt="Kampos - Birthplace of the Dragoons"
                width={800}
                height={600}
                className="w-full h-auto object-cover"
                loading="lazy" // NEW: Performance
              />
            </div>
          </div>

          {/* Text */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-steel-light mb-6 uppercase tracking-wider">
              Kampos
            </h2>
            <div className="h-1 w-24 bg-steel-light mb-6" />

            <p className="text-lg text-foreground-muted leading-relaxed mb-4">
              Originating on{" "}
              <span className="text-steel-light font-semibold">
                Kampos (Ellis IV)
              </span>
              , the Dragoons built a warrior culture founded on honor and
              strength.
            </p>

            <p className="text-lg text-foreground-muted leading-relaxed mb-6">
              This unforgiving world forged the Dragoons into a disciplined,
              legendary fighting force feared across the sector.
            </p>

            {/* External Links */}
            <div className="flex flex-wrap gap-4">
              <Link
                target="_blank"
                rel="noopener noreferrer" // NEW: Security best practice
                href="https://robertsspaceindustries.com/galactapedia/article/RAXxrxr7M5-kampos-ellis-iv"
                className="inline-flex items-center gap-2 px-6 py-3 bg-steel text-foreground font-bold rounded-lg hover:scale-105 hover:shadow-[0_0_40px_rgba(17,78,98,0.6)] transition-all"
              >
                <ExternalLink size={18} />
                Galactapedia
              </Link>

              <Link
                target="_blank"
                rel="noopener noreferrer"
                href="https://robertsspaceindustries.com/en/starmap?location=ELLIS.PLANETS.ELLISIVKAMPOS"
                className="inline-flex items-center gap-2 px-6 py-3 bg-steel text-foreground font-bold rounded-lg hover:scale-105 hover:shadow-[0_0_40px_rgba(17,78,98,0.6)] transition-all"
              >
                <ExternalLink size={18} />
                Star Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 px-4 bg-gradient-to-b from-obsidian to-black overflow-visible">
        {/* NEW: Glow now visible */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-crimson/10 rounded-full blur-[150px]" />

        <div className="max-w-6xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-crimson-light text-center mb-16 uppercase tracking-wider">
            The Great Expansion
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Wars Card */}
            <div className="group bg-gradient-to-br from-crimson-dark/20 to-obsidian border border-crimson/30 rounded-lg p-8 hover:scale-105 transition-all will-change-transform">
              <SafeImage
                src="/images/origins/wars.png"
                alt="Wars of Expansion"
                width={900}
                height={700}
                className="w-full h-64 object-cover rounded-lg mb-6"
                loading="lazy" // NEW
              />
              <h3 className="text-2xl font-bold text-crimson-light mb-4 uppercase">
                Wars of Expansion
              </h3>
              <p className="text-foreground-muted leading-relaxed">
                The Dragoons expanded aggressively, conquering neighboring
                systems and establishing their dominance.
              </p>
            </div>

            {/* Dragoon Space Card */}
            <div className="group bg-gradient-to-br from-steel-dark/20 to-obsidian border border-steel/30 rounded-lg p-8 hover:scale-105 transition-all will-change-transform">
              <SafeImage
                src="/images/origins/dragoonSpace.png"
                alt="Dragoon Space"
                width={900}
                height={700}
                className="w-full h-64 object-cover rounded-lg mb-6"
                loading="lazy"
              />
              <h3 className="text-2xl font-bold text-steel-light mb-4 uppercase">
                Dragoon Space
              </h3>
              <p className="text-foreground-muted leading-relaxed">
                The surrounding sector became known as{" "}
                <strong>Dragoon Space</strong>, signifying unstoppable military
                dominance.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 px-4 bg-gradient-to-b from-shadow to-black overflow-visible">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* NEW: Fixed gradient syntax */}
          <div className="w-[600px] h-[600px] bg-[radial-gradient(circle,var(--tw-gradient-stops))] from-steel/20 via-crimson/10 to-transparent rounded-full blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-steel-light mb-8 uppercase tracking-wider">
            Our Legacy Continues
          </h2>

          <p className="text-xl text-foreground-muted mb-12 leading-relaxed max-w-3xl mx-auto">
            House Wolf carries the Dragoon legacy forward—honoring tradition
            while forging a new path among the stars.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/code"
              className="px-8 py-4 bg-crimson text-foreground font-bold rounded-lg hover:scale-105 hover:shadow-[0_0_40px_rgba(17,78,98,0.6)] transition-all will-change-transform"
            >
              The Dragoon Code
            </Link>
            <Link
              href="/LEADERSHIP"
              className="px-8 py-4 bg-steel text-foreground font-bold rounded-lg hover:scale-105 hover:shadow-[0_0_40px_rgba(17,78,98,0.6)] transition-all will-change-transform"
            >
              Leadership
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

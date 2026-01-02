
import FleetyardsEmbed from "@/components/fleet/FleetyardsEmbed";
import PageHeader from "@/components/layout/PageHeader";

export default function FleetPage() {
    return (
      
        <div className="min-h-screen bg-linear-to-b from-shadow via-obsidian to-night-deep">
              <PageHeader
                title="House Wolf War Pack"
                subtitle="Explore our fleet of ships and vehicles through the interactive display below."
                iconSrc="/images/global/HWiconnew.png"
              />
      <section className="max-w-7xl mx-auto px-6 py-20">
          <FleetyardsEmbed />

      </section>
    </div>
  );
}

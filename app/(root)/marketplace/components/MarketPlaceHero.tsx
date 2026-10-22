import { SafeImage } from "@/components/utils/SafeImage";

/** Marketplace banner with static lighting and no simulated signal failures. */
export default function MarketplaceHero() {
  return (
    <div className="relative mx-auto mb-20 mt-4 w-full sm:mb-28">
      <div className="relative h-[55vh] w-full overflow-hidden rounded-2xl border border-steel/30 shadow-[0_0_60px_rgba(17,78,98,0.3)] sm:h-[60vh] md:h-[65vh]">
        <div className="absolute inset-0">
          <SafeImage
            src="/images/marketplace/HWmarketplace.png"
            alt="Marketplace Hero Banner"
            fill
            sizes="100vw"
            className="object-cover opacity-85"
            priority
          />
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-br from-crimson/20 via-transparent to-steel/20" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(var(--hw-steel-teal) 1px, transparent 1px), linear-gradient(90deg, var(--hw-steel-teal) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-32 w-32 border-l-2 border-t-2 border-steel/60" />
          <div className="absolute right-0 top-0 h-32 w-32 border-r-2 border-t-2 border-steel/60" />
          <div className="absolute bottom-0 left-0 h-32 w-32 border-b-2 border-l-2 border-crimson/60" />
          <div className="absolute bottom-0 right-0 h-32 w-32 border-b-2 border-r-2 border-crimson/60" />
        </div>

        <div className="absolute left-1/2 top-1/2 w-75 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_40px_rgba(17,78,98,0.6)] sm:w-100 md:w-150 lg:w-200 xl:w-275">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 scale-110 bg-gradient-radial from-steel/20 via-steel/10 to-transparent blur-2xl" />
          <SafeImage
            src="/images/marketplace/HWMPHeader.png"
            alt="Marketplace Seal"
            width={1000}
            height={1000}
            className="relative h-auto w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

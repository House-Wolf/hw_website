interface FleetHeroProps {
  totalShips: number;
}

export default function FleetHero({ totalShips }: FleetHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-red-900/30 bg-linear-to-br from-obsidian via-night-midnight to-black p-8 shadow-2xl mb-10">
      
      {/* Background Glow */}
      <div className="absolute inset-0 bg-red-900/10 blur-3xl pointer-events-none" />
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-red-800/20 blur-3xl" />

      <div className="relative z-10 max-w-3xl">
        {/* Header Tag */}
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-500">
          House Wolf Battalion
        </p>

        {/* Main Title */}
        <h1 className="mt-4 text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
          War Pack Fleet Command
        </h1>

        {/* Description */}
        <p className="mt-5 max-w-2xl text-lg text-white/70">
          Operational overview of all registered House Wolf vessels. Monitor fleet readiness,
          analyze capabilities, and prepare for deployment across all operational theaters.
        </p>

        {/* Stats */}
        <div className="mt-8 flex flex-wrap gap-4">
          {/* Ship Count */}
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <p className="text-3xl font-black text-white">
              {totalShips}
            </p>
            <p className="text-xs uppercase tracking-widest text-white/50">
              Registered Ships
            </p>
          </div>

          {/* Status */}
          <div className="rounded-2xl border border-red-800/40 bg-red-950/30 px-5 py-4 backdrop-blur-sm">
            <p className="text-3xl font-black text-white">
              ACTIVE
            </p>
            <p className="text-xs uppercase tracking-widest text-white/50">
              Fleet Status
            </p>
          </div>

          {/* Readiness */}
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <p className="text-3xl font-black text-white">
              READY
            </p>
            <p className="text-xs uppercase tracking-widest text-white/50">
              Deployment State
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
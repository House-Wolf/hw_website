export default function FleetLoading() {
  return (
    <div className="relative min-h-[60vh] flex flex-col items-center justify-center bg-background-base text-white overflow-hidden">
      {/* Wolf watermark */}
      <div
        className="absolute inset-0 opacity-[0.035] bg-center bg-no-repeat bg-contain"
        style={{ backgroundImage: "url(/images/global/HWiconnew.png)" }}
      />

      {/* Spinner */}
      <div className="relative z-10 mt-5">
        <div className="absolute inset-0 rounded-full blur-2xl bg-[#470000]/60 animate-pulse" />
        <div className="relative h-50 w-50 rounded-full border-4 border-white/10 border-t-white animate-spin shadow-[0_0_30px_rgba(71,0,0,0.65)]" />
      </div>

          <p className="mt-6 text-xl uppercase tracking-[0.35em] text-white/50">
        Fleet Command Uplink
      </p>

      <p className="mt-3 text-md uppercase tracking-widest text-white/70">
        Initializing Fleet Systems
      </p>
    </div>
  );
}

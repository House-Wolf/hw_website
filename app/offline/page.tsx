import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline — House Wolf" };

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4"
      style={{ background: "var(--background-base)" }}>
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center border"
          style={{
            background: "rgba(71,0,0,0.15)",
            borderColor: "var(--border-crimson)",
            boxShadow: "var(--shadow-crimson)",
          }}>
          <WifiOff size={36} style={{ color: "var(--accent-primary)" }} />
        </div>

        <h1 className="text-3xl font-bold tracking-widest uppercase"
          style={{ color: "var(--text-primary)" }}>
          No Signal
        </h1>
        <p className="text-base" style={{ color: "var(--text-secondary)" }}>
          You appear to be offline. Check your connection and try again — some
          content may still be available from cache.
        </p>

        <div className="flex gap-4 mt-2">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-md font-semibold text-sm uppercase tracking-wider transition-all"
            style={{
              background: "var(--accent-primary)",
              color: "var(--text-primary)",
              boxShadow: "var(--shadow-crimson)",
            }}>
            Retry
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-md font-semibold text-sm uppercase tracking-wider border transition-all"
            style={{
              borderColor: "var(--border-teal)",
              color: "var(--text-secondary)",
            }}>
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

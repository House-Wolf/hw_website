import { useId } from "react";
import type { DivisionSlug } from "@/lib/divisions/divisionConfig";

// Source canvas sizes and visible artwork bounds (with a small safety margin).
// Frame the supplied PNGs without stretching them or altering the source files.
const PATCH_FRAMES: Record<DivisionSlug, { width: number; height: number; viewBox: string; brightness: number }> = {
  arcops: { width: 757, height: 1085, viewBox: "156 235 439 641", brightness: 2.8 },
  locops: { width: 745, height: 1074, viewBox: "143 213 440 681", brightness: 1.5 },
  specops: { width: 757, height: 1085, viewBox: "156 235 439 640", brightness: 1.7 },
  tacops: { width: 739, height: 1067, viewBox: "144 192 438 637", brightness: 1.55 },
};

export function SpecialtyPatch({ divisionSlug, src, alt }: {
  divisionSlug: DivisionSlug;
  src: string;
  alt: string;
}) {
  const frame = PATCH_FRAMES[divisionSlug];
  const id = useId().replace(/:/g, "");
  const redFilterId = `patch-red-${id}`;
  const letteringClipId = `patch-lettering-${id}`;

  return (
    <svg viewBox={frame.viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label={alt} focusable="false" className="h-full w-full" style={{ filter: `brightness(${frame.brightness})` }}>
      {divisionSlug === "tacops" && (
        <defs>
          {/* Restrict the enhancement to the two embroidered name bands. */}
          <clipPath id={letteringClipId}>
            <rect x="148" y="196" width="430" height="235" />
          </clipPath>
          <filter id={redFilterId} colorInterpolationFilters="sRGB">
            {/* Gently lift existing red thread while preserving its texture and shape. */}
            <feColorMatrix in="SourceGraphic" type="matrix" values="
              1.6 -0.3 -0.3 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 1 0" />
          </filter>
        </defs>
      )}
      <image href={src} width={frame.width} height={frame.height} />
      {divisionSlug === "tacops" && (
        <image href={src} width={frame.width} height={frame.height} filter={`url(#${redFilterId})`} clipPath={`url(#${letteringClipId})`} aria-hidden="true" />
      )}
    </svg>
  );
}

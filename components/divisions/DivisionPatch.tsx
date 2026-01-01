import Image from "next/image";
import type { DivisionDefinition } from "@/lib/divisions/divisionConfig";
import { DIVISION_GLOW } from "@/lib/divisions/divisionConfig"

export function DivisionPatch({ division }: { division: DivisionDefinition }) {
  return (
    <div className="relative flex justify-center group">
      <div className="relative flex h-[180px] w-[180px] items-center justify-center">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-35 transition-all duration-300 group-hover:opacity-50 group-hover:blur-3xl"
          style={{
            background: `radial-gradient(circle, ${DIVISION_GLOW[division.slug]} 0%, transparent 70%)`,
          }}
        />
        <Image
          src={division.patchImagePath}
          alt={division.patchAlt}
          width={150}
          height={150}
          className="relative drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
          priority
        />
      </div>
    </div>
  );
}

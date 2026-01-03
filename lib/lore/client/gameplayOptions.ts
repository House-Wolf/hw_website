import {
  STAR_CITIZEN_GAMEPLAY_LOOPS,
  GameplayLoop,
} from "@/lib/lore/gameplay/gameLoops";

export function getGameplayLoopOptions() {
  return (Object.keys(STAR_CITIZEN_GAMEPLAY_LOOPS) as GameplayLoop[]).map(
    (loop) => ({
      value: loop,
      label: `${loop.replace(/_/g, " ")} – ${
        STAR_CITIZEN_GAMEPLAY_LOOPS[loop]
      }`,
    })
  );
}

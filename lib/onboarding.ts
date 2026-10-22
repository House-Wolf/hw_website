export const ONBOARDING_RULES_VERSION = "2026-10-22";

/** Discord message IDs encode when a previous welcome was actually posted. */
export function needsWelcomeAfterRejoin(joinedAt: string | undefined, welcomeMessageId: string | null | undefined) {
  if (!joinedAt || !welcomeMessageId || !/^\d{17,20}$/.test(welcomeMessageId)) return false;
  const joined = new Date(joinedAt).getTime();
  const posted = Number((BigInt(welcomeMessageId) >> BigInt(22)) + BigInt("1420070400000"));
  return Number.isFinite(joined) && joined > posted;
}

export const ONBOARDING_INTERESTS = [
  { id: "bunker-running", title: "Bunker Running", category: "GROUND OPERATIONS", description: "Clear hostile bunkers. Watch your corners. Bring the squad home.", icon: "crosshair" },
  { id: "space-trucking", title: "Space Trucking", category: "LOGISTICS", description: "Move cargo across the stars. Legal or otherwise, the haul is yours.", icon: "truck" },
  { id: "bounty-hunting", title: "Bounty Hunting", category: "TARGET ACQUISITION", description: "Track NPCs and players. Find your mark. Collect the bounty.", icon: "radar" },
  { id: "mining-49er", title: "Mining 49er", category: "RESOURCE OPERATIONS", description: "Planet-side or deep in an asteroid field, turn rock into opportunity.", icon: "pickaxe" },
  { id: "loot-raiders", title: "Loot Raiders", category: "RECOVERY & RAIDING", description: "Follow your inner loot goblin. Find the valuables. Make them yours.", icon: "gem" },
] as const;

export const ONBOARDING_RULES = [
  { title: "Respect the pack.", text: "Don’t be a dick to your team mates. (no blue falcons)", label: "RESPECT" },
  { title: "Keep your helmet on.", text: "To cover the very small amount of role play, we ask that you try to only wear helmets that do not show your face.", label: "IDENTITY" },
  { title: "Keep comms clear.", text: "Please try to use proper comms etiquette so others may be able to communicate when needed.", label: "DISCIPLINE" },
  { title: "Enjoy the journey.", text: "Have fun!", label: "CAMARADERIE" },
] as const;

export type OnboardingChoices = { interests: string[]; otherGame: string; otherGameSelected: boolean };

export function validateOnboardingChoices(value: unknown): OnboardingChoices | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set<string>(ONBOARDING_INTERESTS.map((interest) => interest.id));
  if (!Array.isArray(input.interests) || input.interests.length > allowed.size ||
    !input.interests.every((interest) => typeof interest === "string" && allowed.has(interest)) ||
    typeof input.otherGameSelected !== "boolean" || typeof input.otherGame !== "string") return null;
  const interests = [...new Set(input.interests as string[])];
  const otherGame = input.otherGame.trim();
  if (otherGame.length > 100 || /[\u0000-\u001f\u007f]/.test(otherGame) ||
    (input.otherGameSelected && !otherGame) || (!interests.length && !input.otherGameSelected)) return null;
  return { interests, otherGame: input.otherGameSelected ? otherGame : "", otherGameSelected: input.otherGameSelected };
}

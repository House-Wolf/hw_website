import { ONBOARDING_RULES_VERSION, validateOnboardingChoices } from "./onboarding";

export const ONBOARDING_RESUME_KEY = "housewolf-onboarding-resume-v1";

/** Resume only a recent explicit rules agreement from this browser tab. */
export function readOnboardingResume(raw: string | null, now = Date.now()) {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    const age = now - draft.rulesAcceptedAt;
    if (draft.rulesAccepted !== true || draft.rulesVersion !== ONBOARDING_RULES_VERSION
      || typeof draft.rulesAcceptedAt !== "number" || !Number.isFinite(age)
      || age < 0 || age > 30 * 60_000) return null;
    return validateOnboardingChoices(draft);
  } catch {
    return null;
  }
}

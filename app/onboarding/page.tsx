import type { Metadata } from "next";
import OnboardingExperience from "./OnboardingExperience";

export const metadata: Metadata = {
  title: "Join the Pack | House Wolf",
  description: "Find your calling. Learn the code. Begin your journey with House Wolf.",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return <OnboardingExperience />;
}

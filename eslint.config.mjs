import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Keep pre-existing React Compiler findings visible during the dependency
  // upgrade. New files retain the recommended error severity.
  {
    files: [
      "app/(dashboard)/dashboard/admin/components/SocialLinksSection.tsx",
      "app/(dashboard)/dashboard/social-links/page.tsx",
    ],
    rules: { "react-hooks/immutability": "warn" },
  },
  {
    files: [
      "app/(dashboard)/dashboard/marketplace/page.tsx",
      "app/(dashboard)/dashboard/profile/components/MercenaryBioForm.tsx",
      "app/onboarding/OnboardingExperience.tsx",
      "contexts/ThemeContext.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  {
    files: ["app/(dashboard)/dashboard/profile/page.tsx"],
    rules: { "react-hooks/error-boundaries": "warn" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma generated files:
    "app/generated/**",
  ]),
]);

export default eslintConfig;

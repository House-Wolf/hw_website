export function getMemberGlow(member: {
  isLeadershipCore?: boolean;
  isOfficerCore?: boolean;
  subdivisionName?: string | null;
  divisionSlug?: string;
}) {
  // Priority 1: Division-specific glow (if divisionSlug exists)
  switch (member.divisionSlug) {
    case "arcops":
      return "#1f4e5f";
    case "locops":
      return "#8a7a2a";
    case "specops":
      return "#2f4b3a";
    case "tacops":
      return "#9a4a1f";
    case "house-wolf-command":
      return "#470000"; // Crimson for House Wolf Command
  }

  // Priority 2: Leadership Core (fallback if no division slug)
  if (member.isLeadershipCore) {
    return "#470000"; // Crimson for leadership core
  }

  // Priority 3: Officer Core (fallback if no division slug)
  if (member.isOfficerCore) {
    return "#6b4423"; // Bronze/amber for officers
  }

  // Default: subtle white glow
  return "#ffffff22";
}

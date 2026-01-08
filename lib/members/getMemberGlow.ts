export function getMemberGlow(member: {
  isLeadershipCore?: boolean;
  isOfficerCore?: boolean;
  subdivisionName?: string | null;
  divisionSlug?: string;
}) {
  if (member.isLeadershipCore) {
    return "#470000"; // Crimson for leadership core
  }

  if (member.isOfficerCore && !member.divisionSlug) {
    return "#6b4423"; // Bronze/amber for officers on leadership page
  }

  switch (member.divisionSlug) {
    case "arcops":
      return "#1f4e5f";
    case "locops":
      return "#8a7a2a";
    case "specops":
      return "#2f4b3a";
    case "tacops":
      return "#9a4a1f";
    default:
      return "#ffffff22";
  }
}

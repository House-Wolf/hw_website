export function getMemberGlow(member: {
  isLeadershipCore?: boolean;
  subdivisionName?: string | null;
  divisionSlug?: string;
}) {
  if (member.isLeadershipCore) {
    return "#470000";
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

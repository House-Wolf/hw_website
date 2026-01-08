import LeadershipPageTemplate from "@/components/divisions/LeadershipPageTemplate";
import { getLeadershipRoster } from "@/lib/divisions/getLeadershipRoster";

export default async function LeadershipPage() {
  const roster = await getLeadershipRoster();

  return (
    <LeadershipPageTemplate
      divisionSlug="division"
      divisionName="House Wolf Command"
      divisionDescription="The elite command structure of House Wolf. Our leaders have proven themselves through honor, strength, and unwavering dedication to the pack.

House Wolf Command oversees all operations, ensuring strategic alignment and decisive action when needed. With vision, accountability, and resolve, House Wolf Command drives the success and integrity of the organization."
      patchImagePath="/images/divisions/leadership.png"
      patchAlt="House Wolf Command Patch"
      leadershipCore={roster.leadershipCore}
      officers={roster.officers}
    />
  );
}

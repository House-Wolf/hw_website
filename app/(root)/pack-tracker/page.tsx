import { redirect } from "next/navigation";

// Land on the dashboard by default
export default function PackTrackerRoot() {
  redirect("/pack-tracker/dashboard");
}

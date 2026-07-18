import { redirect } from "next/navigation";

export default function OldRequestsNewRedirect() {
  redirect("/pack-tracker/assistance/new");
}

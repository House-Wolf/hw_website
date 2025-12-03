import { auth } from "@/lib/auth";
import Header from "./Header";

/**
 * @component HeaderWrapper - Server component wrapper for Header
 * @description Fetches auth session and passes login state to Header
 * @author House Wolf Dev Team
 */
export default async function HeaderWrapper() {
  const session = await auth();

  return <Header isLoggedIn={!!session?.user} />;
}

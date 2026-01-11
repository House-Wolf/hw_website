import "./globals.css";
import { Providers } from "./providers";
import HeaderWrapper from "@/components/layout/HeaderWrapper";
import Navbar from "@/components/layout/Navbar";
import { validateEnv } from "@/lib/env";
import WolfChatLauncher from "@/components/chat/WolfChatLauncher";
import { Analytics } from "@vercel/analytics/next"

/**
 * Root Layout Component
 * @description The root layout for the application, wrapping all pages with common components like header and navbar.
 * @author House Wolf Dev Team
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  validateEnv();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <HeaderWrapper />
          <Navbar />
          {children}
          <Analytics />
          <WolfChatLauncher />
        </Providers>
      </body>
    </html>
  );
}

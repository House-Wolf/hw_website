import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import HeaderWrapper from "@/components/layout/HeaderWrapper";
import Navbar from "@/components/layout/Navbar";
import { validateEnv } from "@/lib/env";
import WolfChatLauncher from "@/components/chat/WolfChatLauncher";
import PwaServiceWorker from "@/components/utils/PwaServiceWorker";
import ScrollbarAutoHide from "@/components/utils/ScrollbarAutoHide";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.housewolf.co"),
  applicationName: "House Wolf",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/images/global/favicon.ico",
    apple: "/images/global/HWiconnew.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "House Wolf",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#114e62",
};

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
          <WolfChatLauncher />
          <PwaServiceWorker />
          <ScrollbarAutoHide />
        </Providers>
      </body>
    </html>
  );
}

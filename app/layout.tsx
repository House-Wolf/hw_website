import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import HeaderWrapper from "@/components/layout/HeaderWrapper";
import Navbar from "@/components/layout/Navbar";
import { validateEnv } from "@/lib/env";
import WolfChatLauncher from "@/components/chat/WolfChatLauncher";
import ScrollbarAutoHide from "@/components/utils/ScrollbarAutoHide";
import PWARegister from "@/components/utils/PWARegister";

export const metadata: Metadata = {
  title: { default: "House Wolf", template: "%s — House Wolf" },
  description:
    "Elite Star Citizen mercenary organization — operations, PackTracker, marketplace, and fleet management.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "House Wolf",
  },
  icons: {
    icon: "/images/global/favicon.ico",
    apple: "/images/pwa/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#470000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
          <ScrollbarAutoHide />
          <PWARegister />
        </Providers>
      </body>
    </html>
  );
}

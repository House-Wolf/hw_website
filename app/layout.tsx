import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/utils/ErrorBoundary";
import { SessionProvider } from "@/components/auth/SessionProvider";
import Header from "@/components/layout/Header";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "House Wolf – Home of the Dragoons",
  description:
    "House Wolf is a Mercenary Star Citizen organization embodying the Dragoon Code of Honor: Strength, Honor, and Death. As warriors devoted to armor, weapons, and war, the Dragoons live by the creed — 'Strength is life, for the strong have the right to rule; Honor is life, for without honor one may as well be dead; Death is life, one should die as they have lived.' Join the pack and rise among the ranks of House Wolf.",
  keywords: [
    "Star Citizen",
    "House Wolf",
    "Dragoons",
    "Gaming Organization",
    "Mercenary Clan",
    "Space Sim",
    "Tactical Operations",
    "Special Operations",
    "Warrior Culture",
  ],
  authors: [{ name: "House Wolf" }],
  metadataBase: new URL("https://www.housewolf.co"),

  // Open Graph (for Facebook, Discord, LinkedIn, etc.)
  openGraph: {
    title: "House Wolf - Home of the Dragoons",
    description:
      "Elite Star Citizen organization specializing in tactical operations, logistics, and special operations. Join the pack!",
    url: "https://www.housewolf.co",
    siteName: "House Wolf",
    images: [
      {
        url: "/HWpic1.png",
        width: 1200,
        height: 630,
        alt: "House Wolf - Home of the Dragoons",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "House Wolf - Home of the Dragoons",
    description:
      "Mercenary Star Citizen organization specializing in tactical operations, logistics, and special operations.",
    images: ["/HWpic1.png"],
  },

  // Additional Meta
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <SessionProvider>
          <Header />
          <Navbar />
          <ErrorBoundary>{children}</ErrorBoundary>
        </SessionProvider>
      </body>
    </html>
  );
}

export const metadata = {
  title: "Community & Socials | House Wolf Dragoons",
  description:
    "Connect with House Wolf across social media platforms. Follow our Star Citizen community on Discord, YouTube, Twitch, and more.",

  openGraph: {
    title: "Community & Socials | House Wolf Dragoons",
    description:
      "Join the House Wolf community across Discord, YouTube, and social media. Connect with fellow mercenaries.",
    url: "https://housewolf.co/socials",
    images: [
      {
        url: "/images/global/social-card.png",
        width: 1200,
        height: 630,
        alt: "House Wolf Dragoons – Community & Socials",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Community & Socials | House Wolf Dragoons",
    description:
      "Connect with House Wolf on Discord, YouTube, and social media.",
    images: ["/images/global/social-card.png"],
  },

  alternates: {
    canonical: "https://housewolf.co/socials",
  },
};

interface SocialsLayoutProps {
  children: React.ReactNode;
}

/**
 * @component SocialsLayout - Layout for the Socials section.
 * @description Provides consistent structure and SEO metadata for community/socials pages.
 * @param {Object} props - The component props.
 * @param {JSX.Element} props.children - The child components to be rendered within the layout.
 * @returns {JSX.Element} The rendered layout component.
 * @author House Wolf Dev Team
 */
export default function SocialsLayout({ children }: SocialsLayoutProps) {
  return (
    <section className="min-h-screen w-full">
      {children}
    </section>
  );
}

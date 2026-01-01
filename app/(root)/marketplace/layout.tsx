export const metadata = {
  title: "Marketplace | House Wolf Dragoons",
  description:
    "Browse and trade items in the House Wolf Dragoons marketplace. Connect with sellers for weapons, armor, components, and services in Star Citizen.",

  openGraph: {
    title: "Marketplace | House Wolf Dragoons",
    description:
      "Trade weapons, armor, and gear with the House Wolf community. Secure Discord-based transactions.",
    url: "https://housewolf.co/marketplace",
    images: [
      {
        url: "/images/global/social-card.png",
        width: 1200,
        height: 630,
        alt: "House Wolf Dragoons – Marketplace",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Marketplace | House Wolf Dragoons",
    description:
      "Browse and trade items in the House Wolf marketplace for Star Citizen.",
    images: ["/images/global/social-card.png"],
  },

  alternates: {
    canonical: "https://housewolf.co/marketplace",
  },
};

interface MarketplaceLayoutProps {
  children: React.ReactNode;
}

/**
 * @component MarketplaceLayout - Layout for the Marketplace section.
 * @description Provides consistent structure and SEO metadata for marketplace pages.
 * @param {Object} props - The component props.
 * @param {JSX.Element} props.children - The child components to be rendered within the layout.
 * @returns {JSX.Element} The rendered layout component.
 * @author House Wolf Dev Team
 */
export default function MarketplaceLayout({ children }: MarketplaceLayoutProps) {
  return (
    <section className="min-h-screen w-full">
      {children}
    </section>
  );
}

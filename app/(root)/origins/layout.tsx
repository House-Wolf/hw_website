export const metadata = {
  title: "Origins | House Wolf Dragoons",
  description:
    "Discover the origins of House Wolf and the legacy of the Kamposian Dragoons. Learn about our history, traditions, and journey through the stars.",

  openGraph: {
    title: "Origins | House Wolf Dragoons",
    description:
      "Explore the history and origins of House Wolf, from the Kamposian Dragoons to Star Citizen.",
    url: "https://housewolf.co/origins",
    images: [
      {
        url: "/images/global/social-card.png",
        width: 1200,
        height: 630,
        alt: "House Wolf Dragoons – Origins",
      },
    ],
    type: "article",
  },

  twitter: {
    card: "summary_large_image",
    title: "Origins | House Wolf Dragoons",
    description:
      "Discover the legacy and history of the Kamposian Dragoons.",
    images: ["/images/global/social-card.png"],
  },

  alternates: {
    canonical: "https://housewolf.co/origins",
  },
};

interface OriginsLayoutProps {
  children: React.ReactNode;
}

/**
 * @component OriginsLayout - Layout for the Origins section.
 * @description Provides consistent structure and SEO metadata for origins pages.
 * @param {Object} props - The component props.
 * @param {JSX.Element} props.children - The child components to be rendered within the layout.
 * @returns {JSX.Element} The rendered layout component.
 * @author House Wolf Dev Team
 */
export default function OriginsLayout({ children }: OriginsLayoutProps) {
  return (
    <section className="min-h-screen w-full">
      {children}
    </section>
  );
}

export const metadata = {
  title: "Divisions | House Wolf Dragoons",
  description:
    "Explore the specialized divisions of House Wolf: ARCCOPS, LOCOPS, SPECOPS, and TACOPS. Meet the teams that make up our Star Citizen organization.",

  openGraph: {
    title: "Divisions | House Wolf Dragoons",
    description:
      "Discover the four divisions of House Wolf and the specialists who lead them into battle.",
    url: "https://housewolf.co/commands",
    images: [
      {
        url: "/images/global/social-card.png",
        width: 1200,
        height: 630,
        alt: "House Wolf Dragoons – Divisions",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Divisions | House Wolf Dragoons",
    description:
      "Explore ARCCOPS, LOCOPS, SPECOPS, and TACOPS divisions.",
    images: ["/images/global/social-card.png"],
  },

  alternates: {
    canonical: "https://housewolf.co/commands",
  },
};

interface CommandsLayoutProps {
  children: React.ReactNode;
}

/**
 * @component CommandsLayout - Layout for the Divisions/Commands section.
 * @description Provides consistent structure and SEO metadata for division pages.
 * @param {Object} props - The component props.
 * @param {JSX.Element} props.children - The child components to be rendered within the layout.
 * @returns {JSX.Element} The rendered layout component.
 * @author House Wolf Dev Team
 */
export default function CommandsLayout({ children }: CommandsLayoutProps) {
  return (
    <section className="min-h-screen w-full">
      {children}
    </section>
  );
}

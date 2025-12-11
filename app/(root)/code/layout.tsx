export const metadata = {
  title: "The Dragoon Code | House Wolf Dragoons",
  description:
    "Discover the warrior creed of the Kamposian Dragoons — Strength, Honor, and Death. Explore the sacred principles that define House Wolf.",

  openGraph: {
    title: "The Dragoon Code | House Wolf Dragoons",
    description:
      "Explore the warrior code of the Dragoons and the traditions House Wolf carries forward.",
    url: "https://housewolf.co/code",
    images: [
      {
        url: "/images/global/social-card.png",
        width: 1200,
        height: 630,
        alt: "House Wolf Dragoons – Dragoon Code",
      },
    ],
    type: "article",
  },

  twitter: {
    card: "summary_large_image",
    title: "The Dragoon Code | House Wolf Dragoons",
    description:
      "Explore the core values: Strength, Honor, and Death — the Dragoon way.",
    images: ["/images/global/social-card.png"],
  },

  alternates: {
    canonical: "https://housewolf.co/code",
  },
};

interface CodeLayoutProps {
  children: React.ReactNode;
}
/**
 * @component CodeLayout - Layout for the Code section of the website.
 * @description This layout component wraps around the Code page content, providing a consistent structure and styling for all child components within the Code section.
 * @param {Object} props - The component props.
 * @param {JSX.Element} props.children - The child components to be rendered within the layout. 
 * @returns {JSX.Element} The rendered layout component.
 * @author House Wolf Dev Team
 */
export default function CodeLayout({ children }: CodeLayoutProps) {
  return (
    <section className="min-h-screen w-full">
      {children}
    </section>
  );
}

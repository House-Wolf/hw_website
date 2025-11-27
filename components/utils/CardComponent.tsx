import { SafeImage } from "./SafeImage";

interface CardComponentProps {
  title: string;
  image: string;
  borderColor: string;
  linearFrom: string;
  linearTo: string;
  hoverShadow?: string;
  titleColor?: string;
  children: React.ReactNode;
}

/**
 * @component CardComponent - A reusable card component for displaying information with an image, title, and content.
 * @description This component renders a stylized card with a linear background, border, and shadow effects. It includes an image at the top,
 * followed by a title and additional content passed as children. The card is designed to be visually appealing and interactive, with hover effects.
 * @param {string} title - The title text to be displayed on the card.
 * @param {string} image - The source URL of the image to be displayed at the top of the card.
 * @param {string} borderColor - The CSS class for the border color of the card.
 * @param {string} linearFrom - The CSS class for the starting color of the linear background linear.
 * @param {string} linearTo - The CSS class for the ending color of the linear background linear.
 * @param {string} [hoverShadow] - Optional CSS class for the shadow effect on hover.
 * @param {string} [titleColor] - Optional CSS class for the title text color.
 * @param {React.ReactNode} children - The content to be displayed within the card, below the title.
 * @returns {JSX.Element} The rendered CardComponent.
 * @example
 * <CardComponent
 *   title="Card Title"
 *  image="/path/to/image.png"
 *  borderColor="border-crimson"
 *  linearFrom="from-crimson-dark"
 *  linearTo="to-obsidian"
 * >
 *   <p>This is the content of the card.</p>
 * </CardComponent>
 * @author House Wolf Dev Team
 */

export default function CardComponent({
  title,
  image,
  borderColor,
  linearFrom,
  linearTo,
  hoverShadow,
  titleColor = "",
  children,
}: CardComponentProps) {
  return (
    <div
      className={`group relative bg-linear-to-br ${linearFrom} ${linearTo} 
        border ${borderColor} rounded-lg p-8 
        transition-all duration-500`}
    >
      {/* Top accent bar */}
      <div
        className={`
        absolute top-0 left-0 w-full h-1 
        opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-lg
        ${
          titleColor
            ? `bg-linear-to-r from-${titleColor} via-${titleColor}-light to-${titleColor}`
            : ""
        }
      `}
      />

      {/* Image Container */}
      <div
        className={`relative mb-6 bg-linear-to-br from-obsidian to-shadow 
        rounded-lg p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)] 
        transition-all duration-300
        ${hoverShadow ? hoverShadow : ""}
      `}
      >
        <SafeImage
          src={image}
          alt={`${title} icon for the Dragoon Code`}
          width={300}
          height={300}
          className="w-full h-72 object-contain rounded-lg opacity-80 
            group-hover:opacity-100 transition-opacity duration-300"
        />
      </div>

      {/* Title */}
      <h3
        className={`text-3xl font-bold mb-4 uppercase tracking-wider 
        ${titleColor ? `text-${titleColor}-light` : "text-foreground"}`}
      >
        {title}
      </h3>

      {/* Description */}
      <div className="text-foreground-muted leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );
}

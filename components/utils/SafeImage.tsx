"use client";
import Image, { ImageProps } from "next/image";
import React, { useState } from "react";

interface SafeImageProps extends ImageProps {
  fallbackSrc?: string;
}

/**
 * @component SafeImage - A React component that displays an image with a fallback option in case of an error.
 * @description This component attempts to load an image from the provided `src` prop. If the image fails to load (e.g., due to a broken URL),
 * it will display a fallback image specified by the `fallbackSrc` prop. If no `fallbackSrc` is provided, it defaults to a predefined image path.
 * @param {string} src - The source URL of the image to be displayed.
 * @param {string} [fallbackSrc="/images/global/HWiconnwew.png"] - The source URL of the fallback image to be displayed if the main image fails to load.
 * @param {ImageProps} props - Additional props to be passed to the underlying Next.js Image component, such as alt, width, height, etc.
 * @example
 * <SafeImage src="/images/example.png" alt="Example Image" width={500} height={300} />
 * @author House Wolf Dev Team
 */

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  fallbackSrc = "/images/global/HWiconnwew.png",
  ...props
}) => {
  const [error, setError] = useState(false);

  return (
    <Image
      src={error ? fallbackSrc : src}
      onError={() => setError(true)}
      {...props}
    />
  );
};

import type { ComponentProps } from "react";

/** Original Figma artworks, served in three local WebP sizes. */
export function Artwork({
  src,
  sizes = "(max-width: 700px) calc(50vw - 40px), (max-width: 950px) 27vw, (max-width: 1279px) 20vw, 225px",
  ...props
}: ComponentProps<"img">) {
  const responsive = src?.match(/^(.*)-480\.webp$/)?.[1];
  return (
    <img
      src={src}
      srcSet={
        responsive
          ? `${responsive}-240.webp 240w, ${responsive}-480.webp 480w, ${responsive}-960.webp 960w`
          : undefined
      }
      sizes={sizes}
      width={480}
      height={480}
      {...props}
    />
  );
}

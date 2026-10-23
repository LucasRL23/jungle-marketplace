import type { ComponentProps } from "react";

/** Original Figma artworks, served in three local WebP sizes. */
export function Artwork({
  src,
  sizes = "(max-width: 700px) 45vw, 260px",
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

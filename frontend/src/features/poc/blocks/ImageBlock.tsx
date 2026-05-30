import type { ImageBlock } from "../types";

interface Props {
  block: ImageBlock;
}

export function ImageBlockComponent({ block }: Props) {
  const { src, alt = "", borderRadius, maxWidth, align = "center" } = block;

  const alignStyle: React.CSSProperties =
    align === "center"
      ? { display: "block", margin: "0 auto" }
      : align === "left"
      ? { display: "block", marginRight: "auto" }
      : { display: "block", marginLeft: "auto" };

  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: "100%",
        ...(maxWidth ? { maxWidth } : {}),
        ...(borderRadius ? { borderRadius } : {}),
        ...alignStyle,
      }}
    />
  );
}

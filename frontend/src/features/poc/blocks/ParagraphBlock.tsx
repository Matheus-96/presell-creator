import type { ParagraphBlock } from "../types";

interface Props {
  block: ParagraphBlock;
}

const fontSizeMap: Record<NonNullable<ParagraphBlock["fontSize"]>, string> = {
  sm: "14px",
  md: "var(--p-body-size)",
  lg: "18px",
};

export function ParagraphBlockComponent({ block }: Props) {
  const { text, textColor, align = "left", fontSize = "md" } = block;

  return (
    <p
      style={{
        lineHeight: "var(--p-body-lh)",
        fontSize: fontSizeMap[fontSize],
        textAlign: align,
        ...(textColor ? { color: textColor } : {}),
        margin: 0,
        padding: "0 var(--p-block-padding-x)",
      }}
    >
      {text}
    </p>
  );
}

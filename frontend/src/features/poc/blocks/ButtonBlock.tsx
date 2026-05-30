import type { ButtonBlock } from "../types";

interface Props {
  block: ButtonBlock;
}

const paddingMap: Record<NonNullable<ButtonBlock["size"]>, string> = {
  sm: "var(--p-space-2) var(--p-space-4)",
  md: "var(--p-space-3) var(--p-space-8)",
  lg: "var(--p-space-4) var(--p-space-10)",
};

export function ButtonBlockComponent({ block }: Props) {
  const {
    text,
    url,
    backgroundColor,
    textColor,
    size = "md",
    align = "center",
  } = block;

  return (
    <div style={{ textAlign: align }}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          padding: paddingMap[size],
          borderRadius: "var(--p-radius-full)",
          textDecoration: "none",
          fontWeight: "var(--p-cta-text-weight)" as React.CSSProperties["fontWeight"],
          fontSize: "var(--p-cta-text-size)",
          lineHeight: "var(--p-cta-text-lh)",
          ...(backgroundColor ? { backgroundColor } : { backgroundColor: "var(--p-cta-green)" }),
          ...(textColor ? { color: textColor } : { color: "#ffffff" }),
        }}
      >
        {text}
      </a>
    </div>
  );
}

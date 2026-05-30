import type { HeroBlock } from "../types";

interface Props {
  block: HeroBlock;
}

export function HeroBlockComponent({ block }: Props) {
  const { headline, subtitle, imageUrl, textColor, backgroundColor } = block;

  const style: React.CSSProperties = {
    padding: "var(--p-space-12) var(--p-space-6)",
    textAlign: "center",
    position: "relative",
    ...(textColor ? { color: textColor } : {}),
    ...(imageUrl
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : backgroundColor
      ? { backgroundColor }
      : {}),
  };

  return (
    <section style={style}>
      <h1
        style={{
          fontSize: "var(--p-h1-size)",
          fontWeight: "var(--p-h1-weight)" as React.CSSProperties["fontWeight"],
          lineHeight: "var(--p-h1-lh)",
          letterSpacing: "var(--p-h1-ls)",
          margin: 0,
        }}
      >
        {headline}
      </h1>
      {subtitle && (
        <p
          style={{
            fontSize: "var(--p-subtitle-size)",
            fontWeight: "var(--p-subtitle-weight)" as React.CSSProperties["fontWeight"],
            lineHeight: "var(--p-subtitle-lh)",
            marginTop: "var(--p-space-4)",
          }}
        >
          {subtitle}
        </p>
      )}
    </section>
  );
}

import type { TitleBlock } from "../types";

interface Props {
  block: TitleBlock;
}

export function TitleBlockComponent({ block }: Props) {
  const { text, level = 2, textColor, align = "center" } = block;

  const style: React.CSSProperties = {
    ...(textColor ? { color: textColor } : {}),
    textAlign: align,
    margin: 0,
    padding: "0 var(--p-block-padding-x)",
  };

  if (level === 1) return <h1 style={style}>{text}</h1>;
  if (level === 3) return <h3 style={style}>{text}</h3>;
  return <h2 style={style}>{text}</h2>;
}

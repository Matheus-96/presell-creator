import type { DividerBlock } from "../types";

interface Props {
  block: DividerBlock;
}

export function DividerBlockComponent({ block }: Props) {
  const { color = "var(--p-line)" } = block;

  return (
    <hr
      style={{
        border: "none",
        borderTop: `1px solid ${color}`,
        margin: 0,
      }}
    />
  );
}

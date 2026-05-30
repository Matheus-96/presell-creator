import type { DividerBlock } from "../types";

interface Props {
  block: DividerBlock;
}

export function DividerBlockComponent({ block }: Props) {
  const { color = "var(--p-line)", spacing = "var(--p-space-6)" } = block;

  return (
    <hr
      style={{
        border: "none",
        borderTop: `1px solid ${color}`,
        margin: `${spacing} 0`,
      }}
    />
  );
}

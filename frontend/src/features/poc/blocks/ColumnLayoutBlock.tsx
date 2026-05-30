import type { ColumnLayoutBlock } from "../types";
import { renderBlock } from "../DynamicPresellRenderer";

interface Props {
  block: ColumnLayoutBlock;
}

export function ColumnLayoutBlockComponent({ block }: Props) {
  const { children, gap = "var(--p-space-4)" } = block;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap,
      }}
    >
      {children.map((child, index) => {
        if ((child as { type: string }).type === "column_layout") {
          console.warn("ColumnLayoutBlock não pode ter ColumnLayoutBlock como filho.");
          return (
            <div
              key={index}
              style={{
                border: "2px solid orange",
                padding: "8px",
                color: "orange",
                flex: "1 1 280px",
              }}
            >
              ColumnLayoutBlock aninhado não é suportado.
            </div>
          );
        }
        return (
          <div key={index} style={{ flex: "1 1 280px", minWidth: 0 }}>
            {renderBlock(child, index)}
          </div>
        );
      })}
    </div>
  );
}

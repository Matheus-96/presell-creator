import type { ListBlock } from "../types";

interface Props {
  block: ListBlock;
}

export function ListBlockComponent({ block }: Props) {
  const { items, ordered = false, icon, textColor } = block;

  const listStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--p-space-2)",
    ...(icon
      ? { listStyle: "none", paddingLeft: "var(--p-block-padding-x)", paddingRight: "var(--p-block-padding-x)" }
      : { paddingLeft: "calc(var(--p-block-padding-x) + 1.25em)", paddingRight: "var(--p-block-padding-x)" }),
    ...(textColor ? { color: textColor } : {}),
    margin: 0,
  };

  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag style={listStyle}>
      {items.map((item, index) => (
        <li key={index}>
          {icon ? (
            <span>
              <span style={{ marginRight: "var(--p-space-2)" }}>{icon}</span>
              {item}
            </span>
          ) : (
            item
          )}
        </li>
      ))}
    </Tag>
  );
}

import type { Block, RootProps } from "./types";
import { HeroBlockComponent } from "./blocks/HeroBlock";
import { TitleBlockComponent } from "./blocks/TitleBlock";
import { ParagraphBlockComponent } from "./blocks/ParagraphBlock";
import { ListBlockComponent } from "./blocks/ListBlock";
import { ButtonBlockComponent } from "./blocks/ButtonBlock";
import { ImageBlockComponent } from "./blocks/ImageBlock";
import { DividerBlockComponent } from "./blocks/DividerBlock";
import { CountdownBlockComponent } from "./blocks/CountdownBlock";
import { ColumnLayoutBlockComponent } from "./blocks/ColumnLayoutBlock";

interface Props {
  blocks: Block[];
  rootProps: RootProps;
}

export function renderBlock(block: Block, index: number): React.ReactNode {
  switch (block.type) {
    case "hero":
      return <HeroBlockComponent key={index} block={block} />;
    case "title":
      return <TitleBlockComponent key={index} block={block} />;
    case "paragraph":
      return <ParagraphBlockComponent key={index} block={block} />;
    case "list":
      return <ListBlockComponent key={index} block={block} />;
    case "button":
      return <ButtonBlockComponent key={index} block={block} />;
    case "image":
      return <ImageBlockComponent key={index} block={block} />;
    case "divider":
      return <DividerBlockComponent key={index} block={block} />;
    case "countdown":
      return <CountdownBlockComponent key={index} block={block} />;
    case "column_layout":
      return <ColumnLayoutBlockComponent key={index} block={block} />;
    default: {
      const unknownBlock = block as { type: string };
      return (
        <div
          key={index}
          style={{
            border: "2px solid red",
            padding: "8px",
            color: "red",
          }}
        >
          Bloco desconhecido: {unknownBlock.type}
        </div>
      );
    }
  }
}

export function DynamicPresellRenderer({ blocks, rootProps }: Props) {
  const {
    backgroundColor,
    backgroundImage,
    gradient,
    blur,
    opacity,
  } = rootProps;

  const containerStyle: React.CSSProperties = {
    position: "relative",
    ...(opacity !== undefined ? { opacity } : {}),
    ...(gradient
      ? { background: gradient }
      : backgroundImage
      ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : backgroundColor
      ? { backgroundColor }
      : {}),
  };

  return (
    <div style={containerStyle}>
      {blur !== undefined && blur > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backdropFilter: `blur(${blur}px)`,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--p-space-6)",
        }}
      >
        {blocks.map((block, index) => renderBlock(block, index))}
      </div>
    </div>
  );
}

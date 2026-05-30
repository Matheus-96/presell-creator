export interface RootProps {
  backgroundColor?: string;
  backgroundImage?: string;
  gradient?: string;
  blur?: number;
  opacity?: number;
}

export interface HeroBlock {
  type: "hero";
  headline: string;
  subtitle?: string;
  imageUrl?: string;
  textColor?: string;
  backgroundColor?: string;
}

export interface TitleBlock {
  type: "title";
  text: string;
  level?: 1 | 2 | 3;
  textColor?: string;
  align?: "left" | "center" | "right";
}

export interface ParagraphBlock {
  type: "paragraph";
  text: string;
  textColor?: string;
  align?: "left" | "center" | "right";
  fontSize?: "sm" | "md" | "lg";
}

export interface ListBlock {
  type: "list";
  items: string[];
  ordered?: boolean;
  icon?: string;
  textColor?: string;
}

export interface ButtonBlock {
  type: "button";
  text: string;
  url: string;
  backgroundColor?: string;
  textColor?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center" | "right";
}

export interface ImageBlock {
  type: "image";
  src: string;
  alt?: string;
  borderRadius?: string;
  maxWidth?: string;
  align?: "left" | "center" | "right";
}

export interface DividerBlock {
  type: "divider";
  color?: string;
  spacing?: string;
}

export interface CountdownBlock {
  type: "countdown";
  variant?: "block" | "banner";
  minutes: number;
  label?: string;
  textColor?: string;
  backgroundColor?: string;
}

export interface ColumnLayoutBlock {
  type: "column_layout";
  gap?: string;
  children: Array<Exclude<Block, ColumnLayoutBlock>>;
}

export type Block =
  | HeroBlock
  | TitleBlock
  | ParagraphBlock
  | ListBlock
  | ButtonBlock
  | ImageBlock
  | DividerBlock
  | CountdownBlock
  | ColumnLayoutBlock;

export interface PresellBlocks {
  rootProps: RootProps;
  blocks: Block[];
}

const VALID_BLOCK_TYPES = [
  "hero",
  "title",
  "paragraph",
  "list",
  "button",
  "image",
  "divider",
  "countdown",
  "column_layout",
] as const;

export function isValidBlockType(type: string): type is Block["type"] {
  return (VALID_BLOCK_TYPES as readonly string[]).includes(type);
}

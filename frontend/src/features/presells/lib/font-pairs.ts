export type FontPairKey = 'system' | 'modern' | 'serious' | 'friendly' | 'bold'

export type FontPair = {
  key: FontPairKey
  label: string
  headingFont: string
  bodyFont: string
  headingStack: string
  bodyStack: string
  googleFontsUrl: string | null
}

export const FONT_PAIRS: Record<FontPairKey, FontPair> = {
  system: {
    key: 'system',
    label: 'Padrão do sistema',
    headingFont: 'system-ui',
    bodyFont: 'system-ui',
    headingStack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    bodyStack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    googleFontsUrl: null,
  },
  modern: {
    key: 'modern',
    label: 'Moderno',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    headingStack: '"Inter", system-ui, -apple-system, sans-serif',
    bodyStack: '"Inter", system-ui, -apple-system, sans-serif',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  },
  serious: {
    key: 'serious',
    label: 'Sério',
    headingFont: 'Merriweather',
    bodyFont: 'Lato',
    headingStack: '"Merriweather", Georgia, "Times New Roman", serif',
    bodyStack: '"Lato", "Helvetica Neue", Arial, sans-serif',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Lato:wght@400;700&display=swap',
  },
  friendly: {
    key: 'friendly',
    label: 'Amigável',
    headingFont: 'Poppins',
    bodyFont: 'Nunito',
    headingStack: '"Poppins", system-ui, -apple-system, sans-serif',
    bodyStack: '"Nunito", system-ui, -apple-system, sans-serif',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Nunito:wght@400;600&display=swap',
  },
  bold: {
    key: 'bold',
    label: 'Impactante',
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
    headingStack: '"Montserrat", "Arial Black", Arial, sans-serif',
    bodyStack: '"Open Sans", "Helvetica Neue", Arial, sans-serif',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Open+Sans:wght@400;600&display=swap',
  },
}

export function getFontPair(key: string | undefined | null): FontPair {
  const resolved = (key ?? 'system') as FontPairKey
  return FONT_PAIRS[resolved] ?? FONT_PAIRS.system
}

export function buildFontCssVars(pair: FontPair): string {
  return [
    `:root {`,
    `  --p-font-heading: ${pair.headingStack};`,
    `  --p-font-body: ${pair.bodyStack};`,
    `  font-family: ${pair.bodyStack};`,
    `}`,
    `h1, h2, h3, h4, h5, h6 {`,
    `  font-family: ${pair.headingStack};`,
    `}`,
  ].join('\n')
}

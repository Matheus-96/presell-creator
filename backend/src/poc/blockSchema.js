/**
 * @typedef {Object} RootProps
 * @property {string} [backgroundColor]
 * @property {string} [backgroundImage]
 * @property {string} [gradient]
 * @property {number} [blur]
 * @property {number} [opacity]
 */

/**
 * @typedef {Object} HeroBlock
 * @property {"hero"} type
 * @property {string} headline
 * @property {string} [subtitle]
 * @property {string} [imageUrl]
 * @property {string} [textColor]
 * @property {string} [backgroundColor]
 */

/**
 * @typedef {Object} TitleBlock
 * @property {"title"} type
 * @property {string} text
 * @property {1|2|3} [level]
 * @property {string} [textColor]
 * @property {"left"|"center"|"right"} [align]
 */

/**
 * @typedef {Object} ParagraphBlock
 * @property {"paragraph"} type
 * @property {string} text
 * @property {string} [textColor]
 * @property {"left"|"center"|"right"} [align]
 * @property {"sm"|"md"|"lg"} [fontSize]
 */

/**
 * @typedef {Object} ListBlock
 * @property {"list"} type
 * @property {string[]} items
 * @property {boolean} [ordered]
 * @property {string} [icon]
 * @property {string} [textColor]
 */

/**
 * @typedef {Object} ButtonBlock
 * @property {"button"} type
 * @property {string} text
 * @property {string} url
 * @property {string} [backgroundColor]
 * @property {string} [textColor]
 * @property {"sm"|"md"|"lg"} [size]
 * @property {"left"|"center"|"right"} [align]
 */

/**
 * @typedef {Object} ImageBlock
 * @property {"image"} type
 * @property {string} src
 * @property {string} [alt]
 * @property {string} [borderRadius]
 * @property {string} [maxWidth]
 * @property {"left"|"center"|"right"} [align]
 */

/**
 * @typedef {Object} DividerBlock
 * @property {"divider"} type
 * @property {string} [color]
 * @property {string} [spacing]
 */

/**
 * @typedef {Object} CountdownBlock
 * @property {"countdown"} type
 * @property {number} minutes
 * @property {string} [label]
 * @property {string} [textColor]
 * @property {string} [backgroundColor]
 */

/**
 * @typedef {Object} ColumnLayoutBlock
 * @property {"column_layout"} type
 * @property {string} [gap]
 * @property {Array<HeroBlock|TitleBlock|ParagraphBlock|ListBlock|ButtonBlock|ImageBlock|DividerBlock|CountdownBlock>} children
 */

/**
 * @typedef {HeroBlock|TitleBlock|ParagraphBlock|ListBlock|ButtonBlock|ImageBlock|DividerBlock|CountdownBlock|ColumnLayoutBlock} Block
 */

/**
 * @typedef {Object} PresellBlocks
 * @property {RootProps} rootProps
 * @property {Block[]} blocks
 */

module.exports = {};

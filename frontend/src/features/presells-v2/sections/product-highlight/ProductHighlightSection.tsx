import { registerSection } from '../registry.ts'
import { SECTION_PADDING, CONTENT_WRAPPER, HEADING_GAP } from '../tokens.ts'
import type { ProductHighlightProps, SectionComponentProps } from '../types.ts'

function SingleProduct({ name, description, imageUrl, originalPrice, price, discountBadge, ctaText, ctaUrl }: ProductHighlightProps) {
  return (
    <div className={`${CONTENT_WRAPPER} flex w-full flex-col items-center gap-8 md:flex-row`}>
      <div className="w-full flex-1">
        {imageUrl ? (
          <img src={imageUrl} alt={name || ''} className="mx-auto h-auto w-full max-w-md rounded-lg shadow" />
        ) : (
          <div data-placeholder="product-image" className="mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 text-sm text-slate-500">
            Imagem do produto
          </div>
        )}
      </div>
      <div className={`w-full flex-1 ${HEADING_GAP} text-center md:text-left`}>
        {discountBadge && (
          <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">{discountBadge}</span>
        )}
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">{name}</h2>
        {description && <p className="text-base text-slate-700">{description}</p>}
        <div className="flex items-baseline justify-center gap-2 md:justify-start">
          {originalPrice && <span className="text-sm text-slate-400 line-through">{originalPrice}</span>}
          {price && <span className="text-2xl font-bold text-slate-900">{price}</span>}
        </div>
        {ctaText && (
          <a href={ctaUrl || '#'} data-presell-cta="" className="inline-block rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-blue-700">
            {ctaText}
          </a>
        )}
      </div>
    </div>
  )
}

function BenefitsList({ title, items }: ProductHighlightProps) {
  return (
    <div className={`${CONTENT_WRAPPER} ${HEADING_GAP}`}>
      {title && <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h2>}
      <ul className="grid gap-4 md:grid-cols-2">
        {(items || []).map((item, index) => (
          <li key={index} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-2xl" role="img">{item.icon}</span>
            <span className="text-sm text-slate-700">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProductHighlightSection({ props }: SectionComponentProps<ProductHighlightProps>) {
  return (
    <section data-section="product-highlight" data-variant={props.variant} className={`w-full ${SECTION_PADDING}`}>
      {props.variant === 'benefits-list' ? <BenefitsList {...props} /> : <SingleProduct {...props} />}
    </section>
  )
}

registerSection('product-highlight', ProductHighlightSection as never)

export default ProductHighlightSection

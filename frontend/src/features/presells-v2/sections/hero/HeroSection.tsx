import { registerSection } from '../registry.ts'
import { SECTION_PADDING, CONTENT_WRAPPER, HEADING_GAP } from '../tokens.ts'
import type { HeroProps, SectionComponentProps } from '../types.ts'

function CenteredHero({ headline, subtitle, ctaText, ctaUrl, imageUrl }: HeroProps) {
  return (
    <div className={`${CONTENT_WRAPPER} flex flex-col items-center gap-8 text-center md:flex-row md:text-left`}>
      <div className={`flex-1 ${HEADING_GAP}`}>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">{headline}</h1>
        <p className="text-base text-slate-700 md:text-lg">{subtitle}</p>
        <div>
          <a href={ctaUrl} data-presell-cta="" className="inline-block rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-blue-700">
            {ctaText}
          </a>
        </div>
      </div>
      <div className="flex-1">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="mx-auto h-auto w-full max-w-md rounded-lg shadow" />
        ) : (
          <div data-placeholder="hero-image" className="mx-auto flex aspect-video w-full max-w-md items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 text-sm text-slate-500">
            Imagem do hero
          </div>
        )}
      </div>
    </div>
  )
}

function SplitHero({ headline, subtitle, ctaText, ctaUrl, imageUrl, imagePosition }: HeroProps) {
  const pos = imagePosition || 'right'
  const textBlock = (
    <div className={`flex-1 ${HEADING_GAP}`}>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">{headline}</h1>
      <p className="text-base text-slate-700 md:text-lg">{subtitle}</p>
      <div>
        <a href={ctaUrl} data-presell-cta="" className="inline-block rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-blue-700">
          {ctaText}
        </a>
      </div>
    </div>
  )
  const imageBlock = (
    <div className="flex-1">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="mx-auto h-auto w-full max-w-md rounded-lg shadow" />
      ) : (
        <div data-placeholder="hero-image" className="mx-auto flex aspect-video w-full max-w-md items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 text-sm text-slate-500">
          Imagem do hero
        </div>
      )}
    </div>
  )
  return (
    <div className={`${CONTENT_WRAPPER} flex flex-col gap-8 md:flex-row md:items-center`}>
      {pos === 'left' ? <>{imageBlock}{textBlock}</> : <>{textBlock}{imageBlock}</>}
    </div>
  )
}

function BackgroundImageHero({ headline, subtitle, ctaText, ctaUrl, imageUrl }: HeroProps) {
  return (
    <div className="relative flex min-h-[400px] items-center justify-center" style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
      <div className="absolute inset-0 bg-black/60" />
      <div className={`${CONTENT_WRAPPER} relative z-10 w-full ${HEADING_GAP} text-center`}>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">{headline}</h1>
        <p className="text-base text-slate-200 md:text-lg">{subtitle}</p>
        <div>
          <a href={ctaUrl} data-presell-cta="" className="inline-block rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-blue-700">
            {ctaText}
          </a>
        </div>
      </div>
    </div>
  )
}

function HeroSection({ props }: SectionComponentProps<HeroProps>) {
  const style = props.bgColor && props.variant !== 'background-image' ? { backgroundColor: props.bgColor } : undefined

  return (
    <section data-section="hero" data-variant={props.variant || 'centered'} className={`w-full ${SECTION_PADDING}`} style={style}>
      {props.variant === 'split' && <SplitHero {...props} />}
      {props.variant === 'background-image' && <BackgroundImageHero {...props} />}
      {(!props.variant || props.variant === 'centered') && <CenteredHero {...props} />}
    </section>
  )
}

registerSection('hero', HeroSection as never)

export default HeroSection

import { registerSection } from '../registry.ts'
import type { HeroProps, SectionComponentProps } from '../types.ts'

function HeroSection({ props }: SectionComponentProps<HeroProps>) {
  const { headline, subtitle, ctaText, ctaUrl, imageUrl, bgColor } = props

  const style = bgColor ? { backgroundColor: bgColor } : undefined

  return (
    <section
      data-section="hero"
      className="w-full px-6 py-16 md:py-24"
      style={style}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 text-center md:flex-row md:text-left">
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            {headline}
          </h1>
          <p className="text-base text-slate-700 md:text-lg">{subtitle}</p>
          <div>
            <a
              href={ctaUrl}
              data-presell-cta=""
              className="inline-block rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-blue-700"
            >
              {ctaText}
            </a>
          </div>
        </div>
        <div className="flex-1">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="mx-auto h-auto w-full max-w-md rounded-lg shadow"
            />
          ) : (
            <div
              data-placeholder="hero-image"
              className="mx-auto flex aspect-video w-full max-w-md items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 text-sm text-slate-500"
            >
              Imagem do hero
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

registerSection('hero', HeroSection as never)

export default HeroSection

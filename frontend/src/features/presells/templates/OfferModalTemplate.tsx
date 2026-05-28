import type { TemplateComponentProps } from './types.ts'

export function OfferModalTemplate({ presell }: TemplateComponentProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">{presell.headline}</h1>

        {presell.subtitle ? (
          <p className="mb-6 text-xl text-gray-600">{presell.subtitle}</p>
        ) : null}

        {presell.imageUrl ? (
          <img
            alt="Imagem da oferta"
            className="mb-6 w-full rounded-lg object-cover"
            src={presell.imageUrl}
          />
        ) : null}

        {presell.body ? (
          <div className="mb-6 text-gray-700 leading-relaxed whitespace-pre-line">{presell.body}</div>
        ) : null}

        {presell.bullets.length > 0 ? (
          <ul className="mb-8 space-y-2">
            {presell.bullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-700">
                <span className="mt-0.5 text-green-500">&#10003;</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <a
          className="block w-full rounded-lg bg-green-500 px-6 py-4 text-center text-lg font-bold text-white hover:bg-green-600"
          href={presell.affiliateUrl}
          rel="noreferrer"
          target="_blank"
        >
          {presell.ctaText}
        </a>
      </div>
    </div>
  )
}

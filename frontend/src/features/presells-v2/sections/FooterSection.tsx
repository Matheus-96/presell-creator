import { registerSection } from './registry.ts'
import type { FooterProps, SectionComponentProps } from './types.ts'

function FooterSection({ props }: SectionComponentProps<FooterProps>) {
  const { legalText, links } = props

  return (
    <footer
      data-section="footer"
      className="w-full bg-slate-900 px-6 py-10 text-slate-200"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        <p className="text-xs text-slate-400">{legalText}</p>
        <ul className="flex flex-wrap items-center justify-center gap-4">
          {(links || []).map((link, index) => (
            <li key={index}>
              <a
                href={link.url}
                className="text-xs text-slate-300 underline transition hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}

registerSection('footer', FooterSection as never)

export default FooterSection

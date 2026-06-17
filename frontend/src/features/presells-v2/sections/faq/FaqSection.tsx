import { registerSection } from '../registry.ts'
import { SECTION_PADDING, CONTENT_WRAPPER_NARROW, HEADING_GAP } from '../tokens.ts'
import type { FaqProps, SectionComponentProps } from '../types.ts'

function FaqSection({ props }: SectionComponentProps<FaqProps>) {
  const { title, items } = props

  return (
    <section data-section="faq" className={`w-full bg-slate-50 ${SECTION_PADDING}`}>
      <div className={`${CONTENT_WRAPPER_NARROW} ${HEADING_GAP}`}>
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h2>
        <ul className="space-y-4">
          {(items || []).map((item, index) => (
            <li key={index} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{item.question}</h3>
              <p className="mt-2 text-sm text-slate-700">{item.answer}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

registerSection('faq', FaqSection as never)

export default FaqSection

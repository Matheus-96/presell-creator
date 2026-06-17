import { registerSection } from '../registry.ts'
import { SECTION_PADDING, CONTENT_WRAPPER, HEADING_GAP, CARD_GAP } from '../tokens.ts'
import type { SectionComponentProps, TestimonialsProps } from '../types.ts'

function TestimonialsSection({ props }: SectionComponentProps<TestimonialsProps>) {
  const { title, items } = props

  return (
    <section data-section="testimonials" className={`w-full ${SECTION_PADDING}`}>
      <div className={`${CONTENT_WRAPPER} ${HEADING_GAP}`}>
        <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h2>
        <div className={`grid ${CARD_GAP} md:grid-cols-2 lg:grid-cols-3`}>
          {(items || []).map((item, index) => (
            <article key={index} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                {item.avatarUrl ? (
                  <img src={item.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div data-placeholder="avatar" className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-100 text-xs text-slate-500">
                    {(item.name || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.role}</p>
                </div>
              </div>
              <p className="text-sm text-slate-700">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

registerSection('testimonials', TestimonialsSection as never)

export default TestimonialsSection

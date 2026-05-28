import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

export function NotFoundPage() {
  useDocumentTitle('Not found')

  return (
    <div className="page page--centered">
      <section className="section-card not-found-card">
        <p className="eyebrow">Unknown route</p>
        <h2>That admin page does not exist.</h2>
        <p className="page-description">
          The shell now exposes dashboard, presell, template, and settings routes.
          If you followed an old link, head back to the main workspace.
        </p>
        <Link className="button-link" to="/">
          Return to dashboard
        </Link>
      </section>
    </div>
  )
}

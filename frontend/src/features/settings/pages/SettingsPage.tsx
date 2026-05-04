import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { appConfig } from '@/config/app-config.ts'
import { useAuth } from '@/features/auth/use-auth.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'
import { adminApi, type AdminContract } from '@/lib/api/admin-api.ts'

type ContractState = {
  isLoading: boolean
  error: string | null
  contract: AdminContract | null
}

const initialState: ContractState = {
  isLoading: true,
  error: null,
  contract: null,
}

export function SettingsPage() {
  useDocumentTitle('Settings')

  const auth = useAuth()
  const [state, setState] = useState<ContractState>(initialState)

  useEffect(() => {
    let isCancelled = false

    async function loadContract() {
      try {
        const contract = await adminApi.getContracts()
        if (!isCancelled) {
          setState({ isLoading: false, error: null, contract })
        }
      } catch (error) {
        if (!isCancelled) {
          setState({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unable to load the API contract.',
            contract: null,
          })
        }
      }
    }

    void loadContract()

    return () => {
      isCancelled = true
    }
  }, [])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Platform settings"
        title="Runtime contract and session details"
        description="This page keeps the new admin shell grounded in the backend contract: auth strategy, CSRF expectations, pagination defaults, and available capabilities."
      />

      <div className="page-grid page-grid--two-up">
        <SectionCard
          eyebrow="Session"
          title="Current auth context"
          description="Derived from the session bootstrap endpoint that guards the rest of the admin app."
        >
          <ul className="list list--spacious">
            <li>
              <strong>Mode:</strong> {appConfig.auth.mode}
            </li>
            <li>
              <strong>Session endpoint:</strong> {appConfig.auth.sessionPath}
            </li>
            <li>
              <strong>User:</strong> {auth.session?.user?.username ?? 'Not authenticated'}
            </li>
            <li>
              <strong>Capabilities:</strong> {(auth.session?.capabilities ?? []).join(', ') || 'None'}
            </li>
          </ul>
        </SectionCard>

        <SectionCard
          eyebrow="Frontend config"
          title="Runtime wiring"
          description="These values come from the shared config module so future routes do not need to parse env vars ad hoc."
        >
          <ul className="list list--spacious">
            <li>
              <strong>App name:</strong> {appConfig.appName}
            </li>
            <li>
              <strong>Environment:</strong> {appConfig.environment}
            </li>
            <li>
              <strong>API base:</strong> {appConfig.apiBaseUrl}
            </li>
            <li>
              <strong>Admin app:</strong> {appConfig.adminBaseUrl}
            </li>
            <li>
              <strong>Legacy admin:</strong> {appConfig.legacyAdminUrl}
            </li>
          </ul>
        </SectionCard>
      </div>

      {state.error ? (
        <SectionCard
          eyebrow="Contract"
          title="API contract unavailable"
          description={state.error}
        >
          <p className="page-description">
            The shell will keep working with hard-coded endpoint paths, but this page expects the contract endpoint to confirm backend capabilities.
          </p>
        </SectionCard>
      ) : null}

      <SectionCard
        eyebrow="API contract"
        title="Backend surface area"
        description="The contract endpoint documents the exact admin APIs this shell is wired to today."
      >
        {state.contract ? (
          <>
            <div className="detail-grid detail-grid--two-up">
              <article className="detail-card">
                <p className="detail-card__label">Version</p>
                <strong>{state.contract.version}</strong>
              </article>
              <article className="detail-card">
                <p className="detail-card__label">Auth strategy</p>
                <strong>{state.contract.auth.strategy}</strong>
              </article>
              <article className="detail-card">
                <p className="detail-card__label">CSRF header</p>
                <strong>{state.contract.auth.csrf.header}</strong>
              </article>
              <article className="detail-card">
                <p className="detail-card__label">Default page size</p>
                <strong>{state.contract.pagination.defaultLimit}</strong>
              </article>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Auth</th>
                    <th>Response</th>
                  </tr>
                </thead>
                <tbody>
                  {state.contract.endpoints.map((endpoint) => (
                    <tr key={endpoint.operationId}>
                      <td>{endpoint.method}</td>
                      <td>{endpoint.path}</td>
                      <td>{endpoint.auth}</td>
                      <td>{endpoint.response ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="empty-state">
            {state.isLoading ? 'Loading API contract…' : 'No contract data available.'}
          </p>
        )}
      </SectionCard>
    </div>
  )
}

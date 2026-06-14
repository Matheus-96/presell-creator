import type { ReactNode } from 'react'

type ModalShellProps = {
  title: string
  onCancel: () => void
  children: ReactNode
}

export function ModalShell({ title, onCancel, children }: ModalShellProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl flex flex-col gap-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  )
}

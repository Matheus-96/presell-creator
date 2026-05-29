export function FormSection({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description ? (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

export type ImageRole = 'hero' | 'background' | 'gallery' | null

export type ImageSelection = {
  url: string
  role: ImageRole
}

interface ImagesStepProps {
  extractedImages: { url: string; type: string }[]
  onComplete: (selections: ImageSelection[]) => void
}

type RoleMap = Record<number, ImageRole>

const ROLES: { id: 'hero' | 'background' | 'gallery'; label: string }[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'background', label: 'Background' },
  { id: 'gallery', label: 'Galeria' },
]

export function ImagesStep({ extractedImages, onComplete }: ImagesStepProps) {
  const [roles, setRoles] = useState<RoleMap>({})

  function assignRole(index: number, role: 'hero' | 'background' | 'gallery') {
    setRoles((prev) => {
      const next: RoleMap = { ...prev }

      if (next[index] === role) {
        next[index] = null
        return next
      }

      if (role === 'hero' || role === 'background') {
        for (const key in next) {
          if (next[Number(key)] === role) {
            next[Number(key)] = null
          }
        }
      }

      next[index] = role
      return next
    })
  }

  function handleComplete() {
    const selections: ImageSelection[] = extractedImages
      .map((img, i) => ({ url: img.url, role: roles[i] ?? null }))
      .filter((s): s is { url: string; role: 'hero' | 'background' | 'gallery' } =>
        s.role !== null,
      )
    onComplete(selections)
  }

  return (
    <div className="section-card flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Selecionar imagens</h2>
        <p className="text-sm text-slate-500 mt-1">
          Atribua um papel a cada imagem. Hero e Background são únicos; Galeria é múltipla.
        </p>
      </div>

      {extractedImages.length === 0 ? (
        <p className="text-sm text-slate-400 italic">Nenhuma imagem encontrada.</p>
      ) : (
        <div className="max-h-[calc(100vh-480px)] overflow-y-auto rounded-lg border border-slate-200 p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {extractedImages.map((img, i) => {
              const role = roles[i] ?? null
              return (
                <div
                  key={img.url + i}
                  className={cn(
                    'flex flex-col gap-2 rounded-xl border p-2 transition-colors',
                    role
                      ? 'border-indigo-400 bg-indigo-50/40'
                      : 'border-slate-200 bg-white',
                  )}
                >
                  <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.url}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {ROLES.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={role === id}
                        onClick={() => assignRole(i, id)}
                        className={cn(
                          'flex-1 py-1 px-1.5 rounded-md text-xs font-semibold border transition-colors',
                          role === id
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={handleComplete}>
          Avançar
        </Button>
      </div>
    </div>
  )
}

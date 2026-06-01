import { useState } from 'react'

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

export function ImagesStep({ extractedImages, onComplete }: ImagesStepProps) {
  const [roles, setRoles] = useState<RoleMap>({})

  function assignRole(index: number, role: 'hero' | 'background' | 'gallery') {
    setRoles((prev) => {
      const next: RoleMap = { ...prev }

      // Toggle off if same role is already active
      if (next[index] === role) {
        next[index] = null
        return next
      }

      // For single-select roles, clear existing assignment of that role from other images
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
    <div>
      <div>
        {extractedImages.map((img, i) => {
          const role = roles[i] ?? null
          return (
            <div key={img.url + i}>
              <img
                src={img.url}
                alt={img.url}
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = 'none'
                }}
              />
              <button
                type="button"
                aria-pressed={role === 'hero'}
                onClick={() => assignRole(i, 'hero')}
              >
                Hero
              </button>
              <button
                type="button"
                aria-pressed={role === 'background'}
                onClick={() => assignRole(i, 'background')}
              >
                Background
              </button>
              <button
                type="button"
                aria-pressed={role === 'gallery'}
                onClick={() => assignRole(i, 'gallery')}
              >
                Galeria
              </button>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={handleComplete}>
        Avançar
      </button>
    </div>
  )
}

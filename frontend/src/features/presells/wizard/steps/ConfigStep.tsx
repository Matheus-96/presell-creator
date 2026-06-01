import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWizardState } from '@/features/presells/wizard/useWizardState.ts'

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function ConfigStep() {
  const { startAnalysis } = useWizardState()

  const [url, setUrl] = useState('')
  const [language, setLanguage] = useState('pt-BR')
  const [prompt, setPrompt] = useState('')
  const [multiVariant, setMultiVariant] = useState(false)

  const urlValid = isValidUrl(url)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!urlValid) return
    startAnalysis({ url, language, prompt, multiVariant })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="config-url">URL do produto</label>
        <input
          id="config-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="config-language">Idioma da presell</label>
        <select
          id="config-language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="pt-BR">Português (BR)</option>
          <option value="en-US">English (US)</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
        </select>
      </div>

      <div>
        <label htmlFor="config-prompt">Instruções adicionais</label>
        <textarea
          id="config-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex: foco em público feminino, tom descontraído..."
          maxLength={500}
        />
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={multiVariant}
            onChange={(e) => setMultiVariant(e.target.checked)}
          />
          Gerar 3 variantes para comparar
        </label>
      </div>

      <button type="submit" disabled={!urlValid}>
        Analisar
      </button>

      <Link to="/presells/new-blank">Criar sem análise</Link>
    </form>
  )
}

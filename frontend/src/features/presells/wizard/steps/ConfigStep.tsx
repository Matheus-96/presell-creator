import { useState } from 'react'
import { Link } from 'react-router-dom'
import { startAnalyzeUrl } from '@/features/presells/lib/presells-api.ts'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import type { WizardConfig } from '@/features/presells/wizard/useWizardState.ts'

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

interface ConfigStepProps {
  onStartAnalysis: (config: WizardConfig, jobId: string) => void
}

export function ConfigStep({ onStartAnalysis }: ConfigStepProps) {

  const [url, setUrl] = useState('')
  const [language, setLanguage] = useState('pt-BR')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  const urlValid = isValidUrl(url)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!urlValid || loading) return
    setLoading(true)
    try {
      const { jobId } = await startAnalyzeUrl(url, prompt || undefined)
      onStartAnalysis({ url, language, prompt }, jobId)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section-card">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Criar presell com IA</h2>
        <p className="text-slate-500 mt-1 text-sm">
          Cole a URL do produto e a IA analisa o conteúdo para gerar sua presell.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="config-url">URL do produto</Label>
          <Input
            id="config-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com/produto"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="config-language">Idioma da presell</Label>
          <select
            id="config-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="pt-BR">Português (BR)</option>
            <option value="en-US">English (US)</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="config-prompt">Instruções adicionais</Label>
          <textarea
            id="config-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: foco em público feminino, tom descontraído..."
            maxLength={500}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
          <span className="text-xs text-slate-400 self-end">{prompt.length}/500</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <Link
            to="/presells/new-blank"
            className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            Criar sem análise
          </Link>
          <Button type="submit" disabled={!urlValid || loading}>
            {loading ? 'Analisando…' : 'Analisar'}
          </Button>
        </div>
      </form>
    </div>
  )
}

import type { TemplateComponent } from './types.ts'

const registry: Record<string, TemplateComponent> = {}

export function registerTemplate(id: string, component: TemplateComponent) {
  registry[id] = component
}

export function getTemplate(id: string): TemplateComponent | null {
  return registry[id] ?? null
}

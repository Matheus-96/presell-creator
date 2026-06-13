import type { SectionComponent, SectionType } from './types.ts'

type AnyComponent = SectionComponent<Record<string, unknown>>

export const registry: Record<string, AnyComponent> = {}

export function registerSection(type: SectionType, component: AnyComponent) {
  registry[type] = component
}

export function getSection(type: string): AnyComponent | null {
  return registry[type] ?? null
}

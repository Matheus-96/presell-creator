export type WizardConfig = {
  url: string
  language: string
  prompt: string
  multiVariant: boolean
}

export type WizardState = {
  startAnalysis: (config: WizardConfig) => void
}

export function useWizardState(): WizardState {
  function startAnalysis(_config: WizardConfig) {
    // TODO: implement analysis kick-off (issue #117 follow-up)
  }

  return { startAnalysis }
}

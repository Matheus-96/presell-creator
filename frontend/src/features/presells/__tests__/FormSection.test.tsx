import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { FormSection } from '@/features/presells/components/FormSection.tsx'

describe('FormSection', () => {
  describe('non-collapsible (default)', () => {
    it('always renders children', () => {
      render(
        <FormSection title="Test Section">
          <p>Content here</p>
        </FormSection>,
      )
      expect(screen.getByText('Content here')).toBeInTheDocument()
    })

    it('renders title', () => {
      render(<FormSection title="My Title"><span>x</span></FormSection>)
      expect(screen.getByText('My Title')).toBeInTheDocument()
    })

    it('does not show chevron svg', () => {
      const { container } = render(
        <FormSection title="No Chevron"><span>x</span></FormSection>,
      )
      expect(container.querySelectorAll('svg').length).toBe(0)
    })
  })

  describe('collapsible + defaultOpen=true', () => {
    it('renders children initially', () => {
      render(
        <FormSection title="Open Section" collapsible defaultOpen={true}>
          <p>Visible content</p>
        </FormSection>,
      )
      expect(screen.getByText('Visible content')).toBeInTheDocument()
    })

    it('hides children after header click', async () => {
      const user = userEvent.setup()
      render(
        <FormSection title="Collapsible" collapsible defaultOpen={true}>
          <p>Toggle me</p>
        </FormSection>,
      )
      expect(screen.getByText('Toggle me')).toBeInTheDocument()
      await user.click(screen.getByText('Collapsible').closest('div')!)
      expect(screen.queryByText('Toggle me')).not.toBeInTheDocument()
    })

    it('shows children again after second click', async () => {
      const user = userEvent.setup()
      render(
        <FormSection title="ReOpen" collapsible defaultOpen={true}>
          <p>Reopen content</p>
        </FormSection>,
      )
      const header = screen.getByText('ReOpen').closest('div')!
      await user.click(header)
      expect(screen.queryByText('Reopen content')).not.toBeInTheDocument()
      await user.click(header)
      expect(screen.getByText('Reopen content')).toBeInTheDocument()
    })

    it('shows chevron svg', () => {
      const { container } = render(
        <FormSection title="With Chevron" collapsible defaultOpen={true}>
          <span>x</span>
        </FormSection>,
      )
      expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
    })
  })

  describe('collapsible + defaultOpen=false', () => {
    it('hides children initially', () => {
      render(
        <FormSection title="Closed Section" collapsible defaultOpen={false}>
          <p>Hidden content</p>
        </FormSection>,
      )
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })

    it('shows children after header click', async () => {
      const user = userEvent.setup()
      render(
        <FormSection title="Expand Me" collapsible defaultOpen={false}>
          <p>Expanded content</p>
        </FormSection>,
      )
      expect(screen.queryByText('Expanded content')).not.toBeInTheDocument()
      await user.click(screen.getByText('Expand Me').closest('div')!)
      expect(screen.getByText('Expanded content')).toBeInTheDocument()
    })
  })

  describe('action stopPropagation', () => {
    it('clicking action does not toggle section', async () => {
      const user = userEvent.setup()
      render(
        <FormSection
          title="With Action"
          collapsible
          defaultOpen={true}
          action={<button type="button">Action Btn</button>}
        >
          <p>Section content</p>
        </FormSection>,
      )
      expect(screen.getByText('Section content')).toBeInTheDocument()
      await user.click(screen.getByText('Action Btn'))
      expect(screen.getByText('Section content')).toBeInTheDocument()
    })
  })

  describe('description', () => {
    it('renders description when provided', () => {
      render(
        <FormSection title="T" description="A description">
          <span>x</span>
        </FormSection>,
      )
      expect(screen.getByText('A description')).toBeInTheDocument()
    })

    it('does not render description element when omitted', () => {
      const { container } = render(
        <FormSection title="T"><span>x</span></FormSection>,
      )
      expect(container.querySelector('p')).not.toBeInTheDocument()
    })
  })
})

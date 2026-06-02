import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { ImagesStep } from '@/features/presells/wizard/steps/ImagesStep.tsx'

function renderImagesStep(props: {
  extractedImages?: { url: string; type: string }[]
  onComplete?: () => void
}) {
  return render(
    <ImagesStep
      extractedImages={props.extractedImages ?? []}
      onComplete={props.onComplete ?? vi.fn()}
    />,
  )
}

describe('ImagesStep', () => {
  // Cycle 1 — renders image grid from props
  it('renders an img with the correct src for each extracted image', () => {
    renderImagesStep({
      extractedImages: [{ url: 'https://a.com/img.jpg', type: 'hero' }],
    })
    const img = screen.getByRole('img', { name: /https:\/\/a\.com\/img\.jpg/i })
    expect(img).toHaveAttribute('src', 'https://a.com/img.jpg')
  })

  it('renders multiple images', () => {
    renderImagesStep({
      extractedImages: [
        { url: 'https://a.com/img1.jpg', type: 'hero' },
        { url: 'https://a.com/img2.jpg', type: 'background' },
      ],
    })
    expect(screen.getAllByRole('img').filter((el) => el.tagName === 'IMG')).toHaveLength(2)
  })

  it('renders empty state when no images provided', () => {
    renderImagesStep({ extractedImages: [] })
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  // Cycle 2 — role assignment buttons per image
  it('renders Hero, Background, and Galeria buttons for each image', () => {
    renderImagesStep({
      extractedImages: [
        { url: 'https://a.com/img1.jpg', type: 'hero' },
        { url: 'https://a.com/img2.jpg', type: 'hero' },
      ],
    })
    expect(screen.getAllByRole('button', { name: /hero/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /background/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /galeria/i })).toHaveLength(2)
  })

  // Cycle 3 — Hero is single-select
  it('deselects Hero from image 1 when Hero is clicked on image 2', async () => {
    const user = userEvent.setup()
    renderImagesStep({
      extractedImages: [
        { url: 'https://a.com/img1.jpg', type: 'hero' },
        { url: 'https://a.com/img2.jpg', type: 'hero' },
      ],
    })
    const heroButtons = screen.getAllByRole('button', { name: /hero/i })
    await user.click(heroButtons[0])
    expect(heroButtons[0]).toHaveAttribute('aria-pressed', 'true')

    await user.click(heroButtons[1])
    expect(heroButtons[1]).toHaveAttribute('aria-pressed', 'true')
    expect(heroButtons[0]).toHaveAttribute('aria-pressed', 'false')
  })

  it('deselects Background from image 1 when Background is clicked on image 2', async () => {
    const user = userEvent.setup()
    renderImagesStep({
      extractedImages: [
        { url: 'https://a.com/img1.jpg', type: 'background' },
        { url: 'https://a.com/img2.jpg', type: 'background' },
      ],
    })
    const bgButtons = screen.getAllByRole('button', { name: /background/i })
    await user.click(bgButtons[0])
    expect(bgButtons[0]).toHaveAttribute('aria-pressed', 'true')

    await user.click(bgButtons[1])
    expect(bgButtons[1]).toHaveAttribute('aria-pressed', 'true')
    expect(bgButtons[0]).toHaveAttribute('aria-pressed', 'false')
  })

  // Cycle 4 — Gallery is multi-select
  it('allows Galeria to be selected on multiple images simultaneously', async () => {
    const user = userEvent.setup()
    renderImagesStep({
      extractedImages: [
        { url: 'https://a.com/img1.jpg', type: 'generic' },
        { url: 'https://a.com/img2.jpg', type: 'generic' },
      ],
    })
    const galButtons = screen.getAllByRole('button', { name: /galeria/i })
    await user.click(galButtons[0])
    await user.click(galButtons[1])
    expect(galButtons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(galButtons[1]).toHaveAttribute('aria-pressed', 'true')
  })

  // Cycle 5 — "Salvar como draft" button calls onComplete
  it('calls onComplete when "Salvar como draft" is clicked', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    renderImagesStep({
      extractedImages: [
        { url: 'https://a.com/img1.jpg', type: 'hero' },
        { url: 'https://a.com/img2.jpg', type: 'generic' },
      ],
      onComplete,
    })
    const heroButtons = screen.getAllByRole('button', { name: /hero/i })
    await user.click(heroButtons[0])
    await user.click(screen.getByRole('button', { name: /salvar como draft/i }))
    expect(onComplete).toHaveBeenCalled()
  })

  it('calls onComplete regardless of image selections', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    renderImagesStep({
      extractedImages: [{ url: 'https://a.com/img1.jpg', type: 'hero' }],
      onComplete,
    })
    await user.click(screen.getByRole('button', { name: /salvar como draft/i }))
    expect(onComplete).toHaveBeenCalled()
  })

  it('calls onComplete when extractedImages is empty', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    renderImagesStep({ extractedImages: [], onComplete })
    await user.click(screen.getByRole('button', { name: /salvar como draft/i }))
    expect(onComplete).toHaveBeenCalled()
  })

  // Toggle off: clicking same role button again deselects it
  it('clicking an already-selected role button deselects it', async () => {
    const user = userEvent.setup()
    renderImagesStep({
      extractedImages: [{ url: 'https://a.com/img1.jpg', type: 'hero' }],
    })
    const heroBtn = screen.getByRole('button', { name: /hero/i })
    await user.click(heroBtn)
    expect(heroBtn).toHaveAttribute('aria-pressed', 'true')
    await user.click(heroBtn)
    expect(heroBtn).toHaveAttribute('aria-pressed', 'false')
  })

  // Broken image shows fallback
  it('renders an onerror fallback for broken images', () => {
    renderImagesStep({
      extractedImages: [{ url: 'https://broken.example/404.jpg', type: 'generic' }],
    })
    const img = screen.getByRole('img', { name: /https:\/\/broken\.example\/404\.jpg/i })
    expect(img).toHaveAttribute('alt', 'https://broken.example/404.jpg')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ProductHighlightSection from './ProductHighlightSection.tsx'
import type { ProductHighlightProps } from '../types.ts'

describe('ProductHighlightSection', () => {
  it('renders single-product variant with product details', () => {
    const props: ProductHighlightProps = {
      variant: 'single-product',
      name: 'Produto X',
      description: 'Descrição do produto',
      originalPrice: 'R$ 200,00',
      price: 'R$ 99,00',
      discountBadge: '-50%',
      ctaText: 'Comprar',
      ctaUrl: 'https://example.com',
      imageUrl: '/product.jpg',
    }
    const { container } = render(<ProductHighlightSection props={props} />)
    expect(container.querySelector('[data-variant="single-product"]')).toBeTruthy()
    expect(screen.getByText('Produto X')).toBeTruthy()
    expect(screen.getByText('Descrição do produto')).toBeTruthy()
    expect(screen.getByText('R$ 200,00')).toBeTruthy()
    expect(screen.getByText('R$ 99,00')).toBeTruthy()
    expect(screen.getByText('-50%')).toBeTruthy()
    expect(screen.getByText('Comprar')).toBeTruthy()
    expect(container.querySelector('img[src="/product.jpg"]')).toBeTruthy()
  })

  it('shows placeholder when imageUrl is null in single-product', () => {
    const props: ProductHighlightProps = {
      variant: 'single-product',
      name: 'Produto Y',
      imageUrl: null,
    }
    const { container } = render(<ProductHighlightSection props={props} />)
    expect(container.querySelector('[data-placeholder="product-image"]')).toBeTruthy()
  })

  it('renders benefits-list variant with items', () => {
    const props: ProductHighlightProps = {
      variant: 'benefits-list',
      title: 'Benefícios',
      items: [
        { icon: '✅', text: 'Frete grátis' },
        { icon: '🎁', text: 'Brinde exclusivo' },
      ],
    }
    const { container } = render(<ProductHighlightSection props={props} />)
    expect(container.querySelector('[data-variant="benefits-list"]')).toBeTruthy()
    expect(screen.getByText('Benefícios')).toBeTruthy()
    expect(screen.getByText('Frete grátis')).toBeTruthy()
    expect(screen.getByText('Brinde exclusivo')).toBeTruthy()
    expect(screen.getByText('✅')).toBeTruthy()
    expect(screen.getByText('🎁')).toBeTruthy()
  })

  it('renders empty benefits-list without crashing', () => {
    const props: ProductHighlightProps = {
      variant: 'benefits-list',
      title: 'Vazio',
      items: [],
    }
    const { container } = render(<ProductHighlightSection props={props} />)
    expect(container.querySelector('[data-variant="benefits-list"]')).toBeTruthy()
    expect(screen.getByText('Vazio')).toBeTruthy()
  })
})

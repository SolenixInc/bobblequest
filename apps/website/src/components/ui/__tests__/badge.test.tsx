import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

import { Badge, badgeVariants } from '../badge'

afterEach(() => {
  cleanup()
})

describe('Badge', () => {
  test('smoke: renders with no props', () => {
    render(<Badge data-testid="badge" />)
    expect(screen.getByTestId('badge')).toBeDefined()
  })

  test('default variant applies bg-primary class', () => {
    render(<Badge data-testid="badge" />)
    expect(screen.getByTestId('badge').className).toContain('bg-primary')
  })

  test('variant=default explicit applies bg-primary class', () => {
    render(<Badge data-testid="badge" variant="default" />)
    expect(screen.getByTestId('badge').className).toContain('bg-primary')
  })

  test('variant=secondary applies bg-secondary class', () => {
    render(<Badge data-testid="badge" variant="secondary" />)
    expect(screen.getByTestId('badge').className).toContain('bg-secondary')
  })

  test('variant=destructive applies bg-destructive class', () => {
    render(<Badge data-testid="badge" variant="destructive" />)
    expect(screen.getByTestId('badge').className).toContain('bg-destructive')
  })

  test('variant=outline applies text-foreground class', () => {
    render(<Badge data-testid="badge" variant="outline" />)
    expect(screen.getByTestId('badge').className).toContain('text-foreground')
  })

  test('className prop is merged alongside variant classes', () => {
    render(<Badge data-testid="badge" className="custom-cls" />)
    const el = screen.getByTestId('badge')
    expect(el.className).toContain('bg-primary')
    expect(el.className).toContain('custom-cls')
  })

  test('arbitrary HTML attrs are spread onto the element', () => {
    render(<Badge data-testid="badge" aria-label="status badge" />)
    expect(screen.getByTestId('badge').getAttribute('aria-label')).toBe('status badge')
  })

  test('badgeVariants returns a string for each variant', () => {
    expect(typeof badgeVariants({ variant: 'default' })).toBe('string')
    expect(typeof badgeVariants({ variant: 'secondary' })).toBe('string')
    expect(typeof badgeVariants({ variant: 'destructive' })).toBe('string')
    expect(typeof badgeVariants({ variant: 'outline' })).toBe('string')
  })
})

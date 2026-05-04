import { cleanup, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) =>
    (args.flat() as (string | false | null | undefined)[]).filter(Boolean).join(' '),
}))

import { Button, buttonVariants } from '../button'

afterEach(() => {
  cleanup()
})

describe('Button', () => {
  test('smoke: renders a button element', () => {
    render(<Button data-testid="btn">Click</Button>)
    expect(screen.getByTestId('btn')).toBeDefined()
    expect(screen.getByTestId('btn').tagName).toBe('BUTTON')
  })

  test('displayName is "Button"', () => {
    expect(Button.displayName).toBe('Button')
  })

  // --- variants ---
  test('variant=default applies bg-primary class', () => {
    render(<Button data-testid="btn" variant="default" />)
    expect(screen.getByTestId('btn').className).toContain('bg-primary')
  })

  test('variant=destructive applies bg-destructive class', () => {
    render(<Button data-testid="btn" variant="destructive" />)
    expect(screen.getByTestId('btn').className).toContain('bg-destructive')
  })

  test('variant=outline applies border class', () => {
    render(<Button data-testid="btn" variant="outline" />)
    expect(screen.getByTestId('btn').className).toContain('border')
  })

  test('variant=secondary applies bg-secondary class', () => {
    render(<Button data-testid="btn" variant="secondary" />)
    expect(screen.getByTestId('btn').className).toContain('bg-secondary')
  })

  test('variant=ghost applies hover:bg-accent class', () => {
    render(<Button data-testid="btn" variant="ghost" />)
    expect(screen.getByTestId('btn').className).toContain('hover:bg-accent')
  })

  test('variant=link applies underline-offset-4 class', () => {
    render(<Button data-testid="btn" variant="link" />)
    expect(screen.getByTestId('btn').className).toContain('underline-offset-4')
  })

  // --- sizes ---
  test('size=default applies h-10 class', () => {
    render(<Button data-testid="btn" size="default" />)
    expect(screen.getByTestId('btn').className).toContain('h-10')
  })

  test('size=sm applies h-9 class', () => {
    render(<Button data-testid="btn" size="sm" />)
    expect(screen.getByTestId('btn').className).toContain('h-9')
  })

  test('size=lg applies h-11 class', () => {
    render(<Button data-testid="btn" size="lg" />)
    expect(screen.getByTestId('btn').className).toContain('h-11')
  })

  test('size=icon applies w-10 class', () => {
    render(<Button data-testid="btn" size="icon" />)
    expect(screen.getByTestId('btn').className).toContain('w-10')
  })

  // --- asChild ---
  test('asChild renders child element, not a <button>', () => {
    render(
      <Button asChild>
        <a href="/home" data-testid="link-btn">
          Home
        </a>
      </Button>,
    )
    // the <a> must be present
    expect(screen.getByTestId('link-btn').tagName).toBe('A')
    // no <button> should exist
    expect(document.querySelector('button')).toBeNull()
  })

  // --- ref forwarding ---
  test('forwards ref to the underlying button element', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref} data-testid="btn" />)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('BUTTON')
  })

  // --- className merge ---
  test('className is merged alongside variant classes', () => {
    render(<Button data-testid="btn" className="extra-cls" />)
    const el = screen.getByTestId('btn')
    expect(el.className).toContain('bg-primary')
    expect(el.className).toContain('extra-cls')
  })

  // --- buttonVariants helper ---
  test('buttonVariants returns a string for all variants', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
    for (const variant of variants) {
      expect(typeof buttonVariants({ variant })).toBe('string')
    }
  })
})

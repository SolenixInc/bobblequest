import { cleanup, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, test } from 'vitest'

import { Separator } from '../separator'

afterEach(() => {
  cleanup()
})

describe('Separator', () => {
  test('smoke: renders with default props', () => {
    render(<Separator data-testid="sep" />)
    expect(screen.getByTestId('sep')).toBeDefined()
  })

  test('default (horizontal) applies h-[1px] w-full classes', () => {
    render(<Separator data-testid="sep" />)
    const el = screen.getByTestId('sep')
    expect(el.className).toContain('h-[1px]')
    expect(el.className).toContain('w-full')
  })

  test('orientation=vertical applies h-full w-[1px] classes', () => {
    render(<Separator data-testid="sep" orientation="vertical" />)
    const el = screen.getByTestId('sep')
    expect(el.className).toContain('h-full')
    expect(el.className).toContain('w-[1px]')
  })

  test('decorative=false renders with role="separator"', () => {
    render(<Separator data-testid="sep" decorative={false} />)
    // Radix sets role="separator" when decorative is false
    expect(screen.getByRole('separator')).toBeDefined()
  })

  test('decorative=true (default) sets role="none"', () => {
    render(<Separator data-testid="sep" decorative={true} />)
    // Radix sets role="none" when decorative=true (not aria-hidden)
    expect(screen.getByTestId('sep').getAttribute('role')).toBe('none')
  })

  test('merges additional className', () => {
    render(<Separator data-testid="sep" className="my-custom" />)
    expect(screen.getByTestId('sep').className).toContain('my-custom')
  })

  test('forwards ref to the underlying element', () => {
    const ref = React.createRef<HTMLElement>()
    render(<Separator ref={ref as React.Ref<HTMLDivElement>} data-testid="sep" />)
    expect(ref.current).not.toBeNull()
  })
})

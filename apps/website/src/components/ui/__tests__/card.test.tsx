import { cleanup, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) =>
    (args.flat() as (string | false | null | undefined)[]).filter(Boolean).join(' '),
}))

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../card'

afterEach(() => {
  cleanup()
})

describe('Card', () => {
  test('smoke: renders a div', () => {
    render(<Card data-testid="card" />)
    expect(screen.getByTestId('card').tagName).toBe('DIV')
  })

  test('contains base class rounded-lg', () => {
    render(<Card data-testid="card" />)
    expect(screen.getByTestId('card').className).toContain('rounded-lg')
  })

  test('merges additional className', () => {
    render(<Card data-testid="card" className="extra" />)
    expect(screen.getByTestId('card').className).toContain('extra')
  })

  test('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<Card ref={ref} data-testid="card" />)
    expect(ref.current?.tagName).toBe('DIV')
  })

  test('displayName is "Card"', () => {
    expect(Card.displayName).toBe('Card')
  })
})

describe('CardHeader', () => {
  test('smoke: renders a div', () => {
    render(<CardHeader data-testid="ch" />)
    expect(screen.getByTestId('ch').tagName).toBe('DIV')
  })

  test('contains base class flex', () => {
    render(<CardHeader data-testid="ch" />)
    expect(screen.getByTestId('ch').className).toContain('flex')
  })

  test('merges additional className', () => {
    render(<CardHeader data-testid="ch" className="extra" />)
    expect(screen.getByTestId('ch').className).toContain('extra')
  })

  test('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<CardHeader ref={ref} data-testid="ch" />)
    expect(ref.current?.tagName).toBe('DIV')
  })

  test('displayName is "CardHeader"', () => {
    expect(CardHeader.displayName).toBe('CardHeader')
  })
})

describe('CardTitle', () => {
  test('smoke: renders a div', () => {
    render(<CardTitle data-testid="ct" />)
    expect(screen.getByTestId('ct').tagName).toBe('DIV')
  })

  test('contains base class font-semibold', () => {
    render(<CardTitle data-testid="ct" />)
    expect(screen.getByTestId('ct').className).toContain('font-semibold')
  })

  test('merges additional className', () => {
    render(<CardTitle data-testid="ct" className="extra" />)
    expect(screen.getByTestId('ct').className).toContain('extra')
  })

  test('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<CardTitle ref={ref} data-testid="ct" />)
    expect(ref.current?.tagName).toBe('DIV')
  })

  test('displayName is "CardTitle"', () => {
    expect(CardTitle.displayName).toBe('CardTitle')
  })
})

describe('CardDescription', () => {
  test('smoke: renders a div', () => {
    render(<CardDescription data-testid="cd" />)
    expect(screen.getByTestId('cd').tagName).toBe('DIV')
  })

  test('contains base class text-muted-foreground', () => {
    render(<CardDescription data-testid="cd" />)
    expect(screen.getByTestId('cd').className).toContain('text-muted-foreground')
  })

  test('merges additional className', () => {
    render(<CardDescription data-testid="cd" className="extra" />)
    expect(screen.getByTestId('cd').className).toContain('extra')
  })

  test('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<CardDescription ref={ref} data-testid="cd" />)
    expect(ref.current?.tagName).toBe('DIV')
  })

  test('displayName is "CardDescription"', () => {
    expect(CardDescription.displayName).toBe('CardDescription')
  })
})

describe('CardContent', () => {
  test('smoke: renders a div', () => {
    render(<CardContent data-testid="cc" />)
    expect(screen.getByTestId('cc').tagName).toBe('DIV')
  })

  test('contains base class p-6', () => {
    render(<CardContent data-testid="cc" />)
    expect(screen.getByTestId('cc').className).toContain('p-6')
  })

  test('merges additional className', () => {
    render(<CardContent data-testid="cc" className="extra" />)
    expect(screen.getByTestId('cc').className).toContain('extra')
  })

  test('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<CardContent ref={ref} data-testid="cc" />)
    expect(ref.current?.tagName).toBe('DIV')
  })

  test('displayName is "CardContent"', () => {
    expect(CardContent.displayName).toBe('CardContent')
  })
})

describe('CardFooter', () => {
  test('smoke: renders a div', () => {
    render(<CardFooter data-testid="cf" />)
    expect(screen.getByTestId('cf').tagName).toBe('DIV')
  })

  test('contains base class items-center', () => {
    render(<CardFooter data-testid="cf" />)
    expect(screen.getByTestId('cf').className).toContain('items-center')
  })

  test('merges additional className', () => {
    render(<CardFooter data-testid="cf" className="extra" />)
    expect(screen.getByTestId('cf').className).toContain('extra')
  })

  test('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<CardFooter ref={ref} data-testid="cf" />)
    expect(ref.current?.tagName).toBe('DIV')
  })

  test('displayName is "CardFooter"', () => {
    expect(CardFooter.displayName).toBe('CardFooter')
  })
})

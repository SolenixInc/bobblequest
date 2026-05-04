/**
 * Tests for renderer/main.tsx — the Electron renderer entry point.
 *
 * main.tsx is a module-level side-effectful script: it queries the DOM for
 * #root, calls ReactDOM.createRoot(), and immediately calls .render() with
 * the full <StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>
 * tree. There is no exported function to call — we exercise it by importing
 * the module and asserting the side effects happened.
 *
 * Strategy:
 *   1. vi.mock('react-dom/client') — capture createRoot / render calls.
 *   2. vi.mock('./App') + vi.mock('./components/ErrorBoundary') — prevent
 *      real component trees from running in jsdom.
 *   3. vi.mock('./styles.css') — prevent Vite CSS import errors in vitest.
 *   4. Seed document.body with <div id="root"> before each import.
 *   5. vi.resetModules() + dynamic import to re-run module-level code.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mocks (module-level — stable across all tests in this file) ─────────────

const mockRender = vi.fn()
const mockCreateRoot = vi.fn(() => ({ render: mockRender }))

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}))

vi.mock('../App', () => ({
  App: () => null,
}))

vi.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}))

// Prevent vitest from choking on a bare CSS import
vi.mock('../styles.css', () => ({}))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('renderer/main.tsx — entry-point side effects', () => {
  beforeEach(() => {
    vi.resetModules()

    // Ensure a fresh #root element exists in the DOM before every import.
    document.body.innerHTML = '<div id="root"></div>'

    mockCreateRoot.mockClear()
    mockRender.mockClear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('calls createRoot with the #root DOM element', async () => {
    await import('../main')

    expect(mockCreateRoot).toHaveBeenCalledTimes(1)
    const calledWith = (mockCreateRoot.mock.calls[0] as unknown[])[0] as Element
    expect(calledWith).toBeInstanceOf(HTMLElement)
    expect((calledWith as HTMLElement).id).toBe('root')
  })

  it('calls .render() on the root returned by createRoot', async () => {
    await import('../main')

    expect(mockRender).toHaveBeenCalledTimes(1)
  })

  it('render receives a React element (non-null JSX tree)', async () => {
    await import('../main')

    const renderedArg = mockRender.mock.calls[0][0] as unknown
    // The rendered element must be a React element (object with $$typeof symbol)
    expect(renderedArg).toBeDefined()
    expect(typeof renderedArg).toBe('object')
    expect(renderedArg).not.toBeNull()
  })

  it('throws synchronously when #root element is missing', async () => {
    // Remove the root element to trigger the guard at the top of main.tsx
    document.body.innerHTML = ''

    await expect(import('../main')).rejects.toThrow('Root element not found')
  })
})

import { renderHook } from '@testing-library/react'
import type * as React from 'react'
import { describe, expect, it } from 'vitest'
import { BillingContext } from '../src/react/BillingProvider'
import { useBilling } from '../src/react/useBilling'

describe('useBilling', () => {
  it('throws when called outside a BillingProvider (null context)', () => {
    // Provide null explicitly — matches the context default before a tracker is set.
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BillingContext.Provider value={null}>{children}</BillingContext.Provider>
    )

    expect(() => renderHook(() => useBilling(), { wrapper })).toThrow(
      'useBilling must be used within a BillingProvider',
    )
  })
})

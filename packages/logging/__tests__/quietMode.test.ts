/**
 * @fileoverview Verifies the global quiet-mode flag. The rewrite only uses
 * `quiet` in the pretty-print (local) path to hide metadata — it does not
 * suppress JSON output. So under production/JSON capture we only assert the
 * getter/setter contract.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { isGlobalQuietMode, setGlobalQuietMode } from '../index.ts'

describe('global quiet mode', () => {
  let initial: boolean

  beforeEach(() => {
    initial = isGlobalQuietMode()
  })

  afterEach(() => {
    setGlobalQuietMode(initial)
  })

  test('setGlobalQuietMode(true) flips the flag', () => {
    setGlobalQuietMode(true)
    expect(isGlobalQuietMode()).toBe(true)
  })

  test('setGlobalQuietMode(false) flips the flag back', () => {
    setGlobalQuietMode(true)
    setGlobalQuietMode(false)
    expect(isGlobalQuietMode()).toBe(false)
  })
})

/**
 * Vitest mock for react-native.
 *
 * This file is resolved via vitest.config.mts alias so imports from
 * react-native can run under jsdom.
 */
export const Platform = {
  OS: 'ios',
}

export const StyleSheet = {
  create: (s: unknown) => s,
}

export const View = () => null

/**
 * Pull in the @testing-library/jest-dom vitest module augmentation so that
 * tsc sees `toBeInTheDocument`, `toHaveTextContent`, etc. on `vitest.Assertion`.
 *
 * The setup file (`src/__tests__/setup.ts`) already does this import at
 * runtime, but TypeScript doesn't execute setup files during `tsc --noEmit`.
 * This ambient reference gives the type-checker the same augmentation.
 */
import '@testing-library/jest-dom/vitest'

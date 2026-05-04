/**
 * @fileoverview Exports all HTTP error classes (4xx and 5xx).
 *
 * This module serves as the central export point for all HTTP error classes
 * in the infrastructure layer, providing a unified interface for importing
 * both client-side (4xx) and server-side (5xx) error types.
 *
 * @module platform/errors/infrastructure
 */

export * from './4xx/index.ts'
export * from './5xx/index.ts'

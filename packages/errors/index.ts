/**
 * @fileoverview Central export point for the error handling module.
 *
 * This module provides a unified interface for all error-related functionality
 * across the application, including:
 * - Core error abstractions (AppError)
 * - HTTP error classes (4xx and 5xx)
 * - Error entities and types
 * - Error transformation utilities
 * - Error handling middleware
 *
 * @module platform/errors
 */

export * from './entities/index.ts'
export * from './infrastructure/index.ts'
export * from './applications/index.ts'
export * from './delivery/index.ts'

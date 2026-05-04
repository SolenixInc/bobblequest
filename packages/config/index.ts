/**
 * Main export module for the config platform module.
 *
 * Provides clean architecture structure for configuration management:
 * - Entities: Domain types and repository interfaces
 * - Infrastructure: Concrete implementations
 * - Dependency Injection: Registration utilities
 */

// Entity layer exports
export * from './entities/index.ts'

// Infrastructure layer exports
export * from './infrastructure/index.ts'

// Dependency injection exports
export * from './dependency-injection/registerConfigRepoDI.ts'

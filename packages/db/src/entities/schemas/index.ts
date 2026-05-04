// Re-export every Drizzle table so `drizzle-kit` introspects the full
// schema from this single entry point (see `drizzle.config.ts`).
export * from './users.ts'
export * from './projects.ts'
export * from './embeddings.ts'

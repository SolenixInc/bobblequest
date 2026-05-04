export { AuthProvider } from './entities/ports/AuthProvider.ts'
export {
  AuthUserSchema,
  type AuthUser,
} from './entities/schemas/AuthUserSchema.ts'
export {
  SessionClaimsSchema,
  type SessionClaims,
} from './entities/schemas/SessionClaimsSchema.ts'
export {
  WebhookEventSchema,
  UserCreatedEventSchema,
  UserUpdatedEventSchema,
  UserDeletedEventSchema,
  type WebhookEvent,
  type UserCreatedEvent,
  type UserUpdatedEvent,
  type UserDeletedEvent,
} from './entities/schemas/WebhookEventSchema.ts'
export { AuthError, type AuthErrorCode } from './entities/types/AuthError.ts'
export type { AuthProviderOptions } from './entities/types/AuthProviderOptions.ts'
export type { UserSyncCallback } from './entities/types/UserSyncCallback.ts'
export {
  ClerkAuthProvider,
  type ClerkAuthProviderOptions,
} from './infrastructure/clerk/ClerkAuthProvider.ts'
export {
  NoopAuthProvider,
  type NoopAuthProviderOptions,
} from './infrastructure/noop/NoopAuthProvider.ts'
export {
  AUTH_DEPENDENCY_KEY,
  registerAuthDI,
  type RegisterAuthDIOptions,
} from './dependency-injection/registerAuthDI.ts'

/**
 * Interface for errors that may have a statusCode property.
 *
 * @description Some external libraries may throw errors with a statusCode
 * property that we need to handle (e.g. HTTP-client SDKs, identity providers).
 */
export interface ErrorWithStatusCode extends Error {
  statusCode?: number
}

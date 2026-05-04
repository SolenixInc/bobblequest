/**
 * Determines the appropriate log level based on status code.\
 * \
 * @param statusCode - HTTP status code
 * @returns Log level to use for this error
 */
export function getLogLevel(statusCode: number): 'warning' | 'info' | 'error' {
  // 401 and 404 are expected errors, log at warning level
  if (statusCode === 401 || statusCode === 404) return 'warning'
  // Other 4xx errors (including validation) are client errors, log at info level
  if (statusCode >= 400 && statusCode < 500) return 'info'
  // 5xx errors are unexpected server errors, log at error level
  return 'error'
}

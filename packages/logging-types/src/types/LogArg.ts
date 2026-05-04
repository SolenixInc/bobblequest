/**
 * @fileoverview Union type accepted by every Logger method.
 */

import type { LogPayload } from './LogPayload.ts'

/** Accepts a string (treated as message) or a structured payload object. */
export type LogArg = string | LogPayload

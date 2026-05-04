/**
 * @fileoverview GlobalLogger — application-scoped (non-request) logger.
 *
 * Thin subclass so callers can use `instanceof GlobalLogger` / `instanceof
 * RequestLogger` to branch behavior (see `packages/errors/delivery/utils/
 * logErrorAtAppropriateLevel.ts`).
 */

import { WinstonLogger } from './winstonLogger.ts'

export class GlobalLogger extends WinstonLogger {}

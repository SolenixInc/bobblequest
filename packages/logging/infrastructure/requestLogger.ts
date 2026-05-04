/**
 * @fileoverview RequestLogger — per-request logger. Distinct class so
 * `instanceof RequestLogger` discriminates per-request vs fallback loggers.
 */

import { WinstonLogger } from './winstonLogger.ts'

export class RequestLogger extends WinstonLogger {}

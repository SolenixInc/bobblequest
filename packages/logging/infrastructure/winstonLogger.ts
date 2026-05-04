/**
 * @fileoverview Concrete winston-backed implementation of the Logger port.
 *
 * GCP-specific concerns (K_SERVICE detection, severity mapping, trace field
 * injection) are intentionally absent — the only remote sink this package
 * ships is the PostHog OTLP transport. Local dev keeps the ANSI-colored
 * pretty-print; non-local emits structured JSON to stdout.
 */

import { relative } from 'node:path'
import process from 'node:process'
import winston from 'winston'
import { LogLevel, type LogType } from '../entities/enums/index.ts'
import { type LogArg, Logger } from '../entities/ports/Logger.ts'
import type { LogContext } from '../entities/types/index.ts'
import { VERSION } from '../version.ts'
import { errorSerializerFormat } from './errorSerializer.ts'
import { isGlobalQuietMode } from './quietMode.ts'
import { buildRedactConfig, redactFormat } from './redactors.ts'
import { getOrCreateOTLPTransport } from './transports/transportFactory.ts'

export interface WinstonLoggerOptions {
  logType?: LogType
  quiet?: boolean
  redactExtraPaths?: readonly string[]
}

interface NormalizedConfig {
  isLocal: boolean
  environment: string
  logLevel: string
  service: string
}

const ANSI = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightBlue: '\x1b[94m',
  brightCyan: '\x1b[96m',
} as const

function colorLevel(level: string): string {
  const upper = level.toUpperCase()
  switch (level) {
    case 'debug':
      return `${ANSI.magenta}${upper}${ANSI.reset}`
    case 'info':
      return `${ANSI.brightBlue}${upper}${ANSI.reset}`
    case 'warn':
      return `${ANSI.yellow}${upper}${ANSI.reset}`
    case 'error':
      return `${ANSI.red}${upper}${ANSI.reset}`
    case 'crit':
    case 'fatal':
      return `${ANSI.brightRed}${ANSI.bright}${upper}${ANSI.reset}`
    default:
      return upper
  }
}

export class WinstonLogger extends Logger {
  protected winstonLogger: winston.Logger
  protected quiet: boolean
  protected logContext: LogContext
  protected config: NormalizedConfig
  protected options: WinstonLoggerOptions

  public get requestId(): string {
    return this.logContext.requestId
  }

  public get userId(): string | undefined {
    return this.logContext.userId
  }

  constructor(logContext: LogContext, options: WinstonLoggerOptions = {}) {
    super()
    this.options = options
    this.quiet = (options.quiet ?? false) || isGlobalQuietMode()
    this.config = this.buildConfig()
    this.logContext = {
      ...logContext,
      fileName: logContext.fileName
        ? relative(process.cwd(), logContext.fileName)
        : logContext.fileName,
    }

    const redact = redactFormat(buildRedactConfig(options.redactExtraPaths ?? []))
    const baseFormats: winston.Logform.Format[] = [
      redact,
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
    ]

    this.winstonLogger = winston.createLogger({
      level: this.config.logLevel,
      format: winston.format.combine(
        ...baseFormats,
        errorSerializerFormat(),
        winston.format.json(),
      ),
      defaultMeta: {
        service: this.config.service,
        environment: this.config.environment,
        version: VERSION,
      },
      transports: this.createTransports(),
    })
  }

  private buildConfig(): NormalizedConfig {
    return {
      // Non-production = local dev/test. Kept env-driven rather than
      // cloud-specific so any host (Railway, Fly, Render, etc.) stays in
      // JSON-structured mode when NODE_ENV=production.
      isLocal: process.env.NODE_ENV !== 'production',
      environment: process.env.ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      logLevel: process.env.LOG_LEVEL ?? 'debug',
      service: process.env.SERVICE_NAME ?? 'core-api',
    }
  }

  private createTransports(): winston.transport[] {
    const transports: winston.transport[] = []

    // Skip OTLP transport during testing to avoid timer leaks.
    const otlpDisabled = process.env.ENVIRONMENT === 'testing'
    if (!otlpDisabled) {
      const otlp = getOrCreateOTLPTransport()
      if (otlp) transports.push(otlp)
    }

    if (this.config.isLocal) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf((info) => this.prettyPrint(info)),
          ),
        }),
      )
    } else {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            errorSerializerFormat(),
            winston.format.json(),
          ),
        }),
      )
    }

    return transports
  }

  private prettyPrint(info: winston.Logform.TransformableInfo): string {
    const { level, message, timestamp, ...rest } = info
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date()
    const timeOnly =
      `${String(date.getHours()).padStart(2, '0')}:` +
      `${String(date.getMinutes()).padStart(2, '0')}:` +
      `${String(date.getSeconds()).padStart(2, '0')}.` +
      `${String(date.getMilliseconds()).padStart(3, '0')}`

    const coloredTimestamp = `${ANSI.gray}${timeOnly}${ANSI.reset}`
    const coloredLevel = colorLevel(level)
    const prefix = this.createLogPrefix()

    // service/environment/version are defaultMeta — noisy in local pretty-print.
    const {
      service: _svc,
      environment: _env,
      version: _ver,
      ...meta
    } = rest as Record<string, unknown>
    const metaStr =
      this.quiet || Object.keys(meta).length === 0
        ? ''
        : `\n${ANSI.dim}${JSON.stringify(meta, null, 2)}${ANSI.reset}`

    return `${coloredTimestamp} [${coloredLevel}]: ${prefix} ${String(message)}${metaStr}`
  }

  private createLogPrefix(overrideFileName?: string): string {
    const fileName = overrideFileName ?? this.logContext.fileName
    const normalized = fileName ? relative(process.cwd(), fileName) : fileName
    const parts: string[] = [`${ANSI.blue}[${this.logContext.requestId}]${ANSI.reset}`]
    if (this.logContext.userId) {
      parts.push(`${ANSI.yellow}[${this.logContext.userId}]${ANSI.reset}`)
    } else {
      parts.push(`${ANSI.magenta}[system]${ANSI.reset}`)
    }
    if (normalized) {
      parts.push(`${ANSI.brightCyan}[${normalized}]${ANSI.reset}`)
    }
    return parts.join(' ')
  }

  private normalize(arg: LogArg, message?: string): { msg: string; meta: Record<string, unknown> } {
    if (typeof arg === 'string') {
      return { msg: message && message.length > 0 ? message : arg, meta: {} }
    }
    const { message: msgFromObj, metadata, fileName, ...rest } = arg
    const finalMsg = message && message.length > 0 ? message : (msgFromObj ?? '')
    const meta: Record<string, unknown> = { ...(metadata ?? {}), ...rest }
    if (fileName !== undefined) meta.fileName = fileName
    return { msg: finalMsg, meta }
  }

  private logMessage(params: {
    level: LogLevel
    msg: string
    meta: Record<string, unknown>
    tag?: string
  }): void {
    const fileName = (params.meta.fileName as string | undefined) ?? this.logContext.fileName
    const normalizedFileName = fileName ? relative(process.cwd(), fileName) : fileName

    const logData: Record<string, unknown> = {
      requestId: this.logContext.requestId,
      userId: this.logContext.userId,
      fileName: normalizedFileName,
      ...this.logContext.metadata,
      ...params.meta,
    }
    // Winston's internal logger.js does `Object.assign({}, defaultMeta, meta, { level, message })`,
    // so a `level` key in meta is clobbered by the call-site level. Use `severity` for the
    // fatal marker since winston leaves it untouched.
    if (params.tag) logData.severity = params.tag

    this.winstonLogger.log(params.level, params.msg, logData)
  }

  debug(arg: LogArg, message?: string): void {
    const { msg, meta } = this.normalize(arg, message)
    this.logMessage({ level: LogLevel.DEBUG, msg, meta })
  }

  info(arg: LogArg, message?: string): void {
    const { msg, meta } = this.normalize(arg, message)
    this.logMessage({ level: LogLevel.INFO, msg, meta })
  }

  warn(arg: LogArg, message?: string): void {
    const { msg, meta } = this.normalize(arg, message)
    this.logMessage({ level: LogLevel.WARNING, msg, meta })
  }

  error(arg: LogArg, message?: string): void {
    const { msg, meta } = this.normalize(arg, message)
    this.logMessage({ level: LogLevel.ERROR, msg, meta })
  }

  // Winston has no `fatal` level by default; map to `error` wire-level but
  // keep a `severity: 'fatal'` tag in meta so downstream consumers can still
  // distinguish fatals in aggregations. (`level` would be clobbered by winston's
  // internal Object.assign — see logMessage for details.)
  fatal(arg: LogArg, message?: string): void {
    const { msg, meta } = this.normalize(arg, message)
    this.logMessage({ level: LogLevel.ERROR, msg, meta, tag: 'fatal' })
  }

  child(bindings: Partial<LogContext> & Record<string, unknown>): WinstonLogger {
    const { requestId, userId, fileName, metadata, ...extra } = bindings
    const mergedContext: LogContext = {
      requestId: requestId ?? this.logContext.requestId,
      userId: userId ?? this.logContext.userId,
      fileName: fileName ?? this.logContext.fileName,
      metadata: {
        ...(this.logContext.metadata ?? {}),
        ...(metadata ?? {}),
        ...extra,
      },
    }
    const Ctor = this.constructor as new (
      ctx: LogContext,
      opts?: WinstonLoggerOptions,
    ) => WinstonLogger
    return new Ctor(mergedContext, this.options)
  }
}

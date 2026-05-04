# @t/logging-types

Platform-neutral Logger port, enums, and shared types extracted from `@t/logging`.

## What's here

- `Logger` — abstract class defining the 5-level logging contract (`debug/info/warn/error/fatal`)
  plus `child()` and the `warning()` alias
- `LogLevel` / `LogType` — enums shared across logging implementations
- `LogContext` / `LogPayload` / `LogArg` — interface and type definitions

## Why it's split

`@t/logging` pulls in Winston, OpenTelemetry, and Node-only transports. This package has zero
runtime dependencies — pure TypeScript types and abstract classes — so `@t/logging-browser` (and any
other environment-specific implementation) can depend on the same port without bundling server-only
code.

## Usage

```ts
import { Logger, LogLevel, type LogContext } from '@t/logging-types'
```

Wire your own `class MyLogger extends Logger { ... }` against the port.

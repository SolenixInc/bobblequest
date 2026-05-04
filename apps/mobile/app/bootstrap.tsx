/**
 * Bootstrap status screen — reachable at /bootstrap via expo-router.
 *
 * Proves: app booted, required env vars are present (presence only, never
 * renders values), the API /bootstrap endpoint is reachable, and reports
 * the Expo runtime version.
 *
 * No auth required. Intended for first-run diagnostics and local dev smoke
 * testing. Do not gate this behind a sign-in flow.
 */

import Constants from 'expo-constants'
import { useEffect, useState } from 'react'
import { Platform, ScrollView, Text, View } from 'react-native'

// ---------------------------------------------------------------------------
// Env var inventory — presence only
// ---------------------------------------------------------------------------

const ENV_VARS: Array<{ label: string; value: string | undefined }> = [
  { label: 'EXPO_PUBLIC_API_URL', value: process.env.EXPO_PUBLIC_API_URL },
  {
    label: 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
    value: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  {
    label: 'EXPO_PUBLIC_REVENUECAT_APPLE_KEY',
    value: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
  },
  {
    label: 'EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY',
    value: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY,
  },
]

// ---------------------------------------------------------------------------
// API connectivity
// ---------------------------------------------------------------------------

interface ApiStatus {
  state: 'pending' | 'ok' | 'error'
  db?: string
  di?: string
  error?: string
}

function deriveBootstrapUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/trpc'
  // Strip /trpc suffix so we hit the base API server's /bootstrap route.
  const base = raw.replace(/\/trpc\/?$/, '')
  return `${base}/bootstrap`
}

// ---------------------------------------------------------------------------
// Runtime info
// ---------------------------------------------------------------------------

const sdkVersion: string = (Constants.expoConfig?.sdkVersion as string | undefined) ?? 'unknown'
const appVersion: string = (Constants.expoConfig?.version as string | undefined) ?? 'unknown'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-foreground/50">
      {title}
    </Text>
  )
}

function Row({
  label,
  status,
  value,
}: {
  label: string
  status: 'ok' | 'missing' | 'info'
  value: string
}) {
  const icon = status === 'ok' ? '✓' : status === 'missing' ? '✗' : '·'
  const textColor =
    status === 'ok' ? 'text-green-600' : status === 'missing' ? 'text-red-500' : 'text-foreground'

  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text className={`ml-2 text-sm font-medium ${textColor}`}>
        {icon} {status === 'info' ? value : status}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function BootstrapScreen() {
  const [api, setApi] = useState<ApiStatus>({ state: 'pending' })

  useEffect(() => {
    const url = deriveBootstrapUrl()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        clearTimeout(timeout)
        if (!res.ok) {
          setApi({ state: 'error', error: `HTTP ${res.status}` })
          return
        }
        const json = (await res.json()) as Record<string, unknown>
        setApi({
          state: 'ok',
          db: typeof json.db === 'string' ? json.db : JSON.stringify(json.db ?? 'n/a'),
          di: typeof json.di === 'string' ? json.di : JSON.stringify(json.di ?? 'n/a'),
        })
      })
      .catch((err: unknown) => {
        clearTimeout(timeout)
        const message = err instanceof Error ? err.message : String(err)
        setApi({ state: 'error', error: message })
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-12 pt-4">
      <Text className="text-2xl font-semibold text-foreground">Bootstrap</Text>
      <Text className="mt-1 text-sm text-foreground/60">App health check</Text>

      {/* ------------------------------------------------------------------ */}
      {/* Environment */}
      {/* ------------------------------------------------------------------ */}
      <SectionHeader title="Environment" />
      <View className="rounded-lg border border-border bg-card px-4 py-2">
        {ENV_VARS.map(({ label, value }) => (
          <Row
            key={label}
            label={label}
            status={value ? 'ok' : 'missing'}
            value={value ? 'set' : 'missing'}
          />
        ))}
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* API Connectivity */}
      {/* ------------------------------------------------------------------ */}
      <SectionHeader title="API Connectivity" />
      <View className="rounded-lg border border-border bg-card px-4 py-2">
        <Row
          label={deriveBootstrapUrl()}
          status={api.state === 'ok' ? 'ok' : api.state === 'error' ? 'missing' : 'info'}
          value={
            api.state === 'pending'
              ? 'checking…'
              : api.state === 'ok'
                ? 'ok'
                : `unreachable: ${api.error ?? 'unknown'}`
          }
        />
        {api.state === 'ok' && (
          <>
            <Row label="db" status="info" value={api.db ?? 'n/a'} />
            <Row label="di" status="info" value={api.di ?? 'n/a'} />
          </>
        )}
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Runtime */}
      {/* ------------------------------------------------------------------ */}
      <SectionHeader title="Runtime" />
      <View className="rounded-lg border border-border bg-card px-4 py-2">
        <Row label="Expo SDK" status="info" value={sdkVersion} />
        <Row label="App version" status="info" value={appVersion} />
        <Row label="Platform" status="info" value={Platform.OS} />
      </View>
    </ScrollView>
  )
}

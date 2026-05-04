import { useState } from 'react'
import { useSignIn } from '../lib/clerk'

/**
 * Headless email-code sign-in flow.
 *
 * Electron loads the renderer from `file://`, which prevents OAuth redirect
 * URIs from working. Instead we use Clerk's first-factor `email_code`
 * strategy: step 1 creates a sign-in attempt with the email and triggers
 * the verification email; step 2 submits the 6-digit code returned by the
 * email. When the attempt completes, we activate the returned session and
 * Clerk's React state transitions the UI to `<SignedIn />`.
 */
export function Login() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded || !signIn) return
    setLoading(true)
    setError(null)

    try {
      const attempt = await signIn.create({ identifier: email })
      const emailFactor = attempt.supportedFirstFactors?.find(
        (f): f is typeof f & { strategy: 'email_code'; emailAddressId: string } =>
          f.strategy === 'email_code',
      )
      if (!emailFactor) {
        setError('Email code sign-in is not enabled for this account.')
        setLoading(false)
        return
      }
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId,
      })
      setStage('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded || !signIn) return
    setLoading(true)
    setError(null)

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      })
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive?.({ session: result.createdSessionId })
      } else {
        setError('Additional verification required.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      {stage === 'email' ? (
        <form
          className="flex w-full max-w-sm flex-col gap-4 rounded border p-6"
          onSubmit={handleRequestCode}
        >
          <h1 className="text-2xl font-bold">Log in</h1>
          <input
            className="rounded border px-3 py-2"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            type="email"
            value={email}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            disabled={loading || !isLoaded}
            type="submit"
          >
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form
          className="flex w-full max-w-sm flex-col gap-4 rounded border p-6"
          onSubmit={handleVerifyCode}
        >
          <h1 className="text-2xl font-bold">Enter code</h1>
          <p className="text-sm text-muted-foreground">We sent a verification code to {email}.</p>
          <input
            className="rounded border px-3 py-2"
            inputMode="numeric"
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            required
            type="text"
            value={code}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            disabled={loading || !isLoaded}
            type="submit"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
          <button
            className="text-sm underline"
            onClick={() => {
              setStage('email')
              setCode('')
              setError(null)
            }}
            type="button"
          >
            Use a different email
          </button>
        </form>
      )}
    </main>
  )
}

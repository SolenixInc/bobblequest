import { useOAuth, useSignIn, useSignInWithApple } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useState } from 'react'
import { Platform, Pressable, Text, TextInput, View } from 'react-native'

WebBrowser.maybeCompleteAuthSession()

/**
 * Native sign-in screen.
 *
 * Clerk does not ship a hosted `<SignIn />` component for React Native — on
 * mobile the integration is always a custom UI backed by the `useSignIn`
 * hook. See https://clerk.com/docs/quickstarts/expo.
 */
export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit() {
    if (!isLoaded || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const attempt = await signIn.create({ identifier: email, password })
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId })
        router.replace('/(app)/home')
      } else {
        setError(`Sign-in incomplete: ${attempt.status}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="mb-8 text-2xl font-semibold text-foreground">Sign in</Text>
      <TextInput
        className="mb-3 w-full rounded-md border border-border bg-card px-4 py-3 text-foreground"
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="mb-4 w-full rounded-md border border-border bg-card px-4 py-3 text-foreground"
        placeholder="Password"
        autoCapitalize="none"
        autoComplete="password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text className="mb-3 text-destructive">{error}</Text> : null}
      <Pressable
        className="w-full rounded-md bg-primary px-4 py-3"
        disabled={submitting}
        onPress={onSubmit}
      >
        <Text className="text-center font-medium text-primary-foreground">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Text>
      </Pressable>
      <GoogleSignInButton />
      {Platform.OS === 'ios' ? <AppleSignInButton /> : null}
    </View>
  )
}

function GoogleSignInButton() {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })
  const router = useRouter()

  const onPress = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/dashboard', { scheme: 'template' }),
      })

      if (createdSessionId) {
        await setActive?.({ session: createdSessionId })
        router.replace('/(app)/home')
      }
    } catch (err) {
      console.error('OAuth error', err)
    }
  }, [startOAuthFlow, router])

  return (
    <Pressable
      className="mt-3 w-full rounded-md border border-border bg-card px-4 py-3"
      onPress={onPress}
    >
      <Text className="text-center font-medium text-foreground">Sign in with Google</Text>
    </Pressable>
  )
}

function AppleSignInButton() {
  const { startAppleAuthenticationFlow } = useSignInWithApple()
  const { setActive } = useSignIn()
  const router = useRouter()

  async function onPress() {
    try {
      const result = await startAppleAuthenticationFlow()
      if (result.createdSessionId) {
        await setActive?.({ session: result.createdSessionId })
        router.replace('/(app)/home')
      }
    } catch (err: unknown) {
      if (
        err !== null &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        return
      }
      console.error('[AppleSignIn]', err)
    }
  }

  return (
    <Pressable className="mt-3 w-full rounded-md bg-black px-4 py-3" onPress={onPress}>
      <Text className="text-center font-medium text-white">Sign in with Apple</Text>
    </Pressable>
  )
}

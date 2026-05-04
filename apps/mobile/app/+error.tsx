import { useAnalytics } from '@t/analytics-rn'
import { useEffect } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

/**
 * Global Error Boundary for Expo Router.
 *
 * Automatically captures exceptions and reports them to PostHog analytics
 * before displaying a fallback UI with a retry option.
 */
export default function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const analytics = useAnalytics()

  useEffect(() => {
    // Report the error to PostHog
    analytics.captureException(error, 'mobile-error-boundary', {
      source: 'ErrorBoundary',
      message: error.message,
    })
  }, [error, analytics])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error.message}</Text>
      <TouchableOpacity style={styles.button} onPress={retry}>
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

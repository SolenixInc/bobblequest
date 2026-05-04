/**
 * Paywall screen — wraps RevenueCatUI's embedded paywall.
 *
 * Navigate here via router.push('/paywall'). On dismiss the screen
 * calls router.back() so navigation is non-destructive.
 */
import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import RevenueCatUI from 'react-native-purchases-ui'

export default function PaywallScreen() {
  const router = useRouter()

  function handleDismiss() {
    router.back()
  }

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall onDismiss={handleDismiss} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

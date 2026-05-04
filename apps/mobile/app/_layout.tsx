import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Providers } from '../src/lib/providers'
import '../global.css'

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="bootstrap" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </Providers>
  )
}

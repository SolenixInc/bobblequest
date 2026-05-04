import { useRouter } from 'expo-router'
import { Pressable, SafeAreaView, Text, View } from 'react-native'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-3 text-3xl font-bold text-foreground">Welcome to Template Mobile</Text>
        <Text className="mb-10 text-center text-base text-muted-foreground">
          A clean-architecture Expo + tRPC + Clerk starter.
        </Text>

        <Pressable
          className="mb-4 w-full rounded-md bg-primary px-4 py-3"
          onPress={() => router.push('/(auth)/login')}
        >
          <Text className="text-center font-medium text-primary-foreground">Sign in</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/bootstrap')}>
          <Text className="text-center text-sm text-muted-foreground underline">
            Open diagnostics
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

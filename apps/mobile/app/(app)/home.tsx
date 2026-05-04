import { useAuth } from '../../src/lib/clerk'
import { trpc } from '../../src/lib/trpc'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

export default function HomeScreen() {
  const { signOut } = useAuth()

  const meQuery = trpc.users.me.useQuery()

  const onSignOut = async () => {
    await signOut()
  }

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="mb-4 text-2xl font-semibold text-foreground">Welcome</Text>

      {meQuery.isLoading ? (
        <ActivityIndicator />
      ) : meQuery.error ? (
        <Text className="text-sm text-red-600">Error: {meQuery.error.message}</Text>
      ) : meQuery.data ? (
        <Text className="mb-6 text-base text-foreground">
          Signed in as {meQuery.data.email ?? meQuery.data.id}
        </Text>
      ) : null}

      <Pressable className="rounded-md bg-primary px-4 py-3" onPress={onSignOut}>
        <Text className="font-medium text-white">Sign out</Text>
      </Pressable>
    </View>
  )
}

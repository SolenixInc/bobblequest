import { Dashboard } from './components/Dashboard'
import { Login } from './components/Login'
import { SignedIn, SignedOut } from './lib/clerk'
import { TrpcProvider } from './lib/providers'

export function AuthFlow() {
  return (
    <TrpcProvider>
      <SignedIn>
        <Dashboard />
      </SignedIn>
      <SignedOut>
        <Login />
      </SignedOut>
    </TrpcProvider>
  )
}

export default AuthFlow

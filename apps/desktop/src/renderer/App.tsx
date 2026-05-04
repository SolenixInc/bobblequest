import { Suspense, lazy, useEffect, useState } from 'react'
import { Welcome } from './components/Welcome'
import { BootstrapRoute } from './routes/bootstrap'

const AuthFlow = lazy(() => import('./AuthFlow'))

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    function onHashChange() {
      setHash(window.location.hash)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return hash
}

export function App() {
  const hash = useHashRoute()
  const [started, setStarted] = useState(false)

  if (hash === '#/bootstrap') {
    return <BootstrapRoute />
  }

  if (!started) {
    return <Welcome onGetStarted={() => setStarted(true)} />
  }

  return (
    <Suspense fallback={null}>
      <AuthFlow />
    </Suspense>
  )
}

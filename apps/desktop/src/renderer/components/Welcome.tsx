interface WelcomeProps {
  onGetStarted: () => void
}

export function Welcome({ onGetStarted }: WelcomeProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Template Desktop</h1>
          <p className="text-sm text-muted-foreground">
            Your all-in-one desktop workspace — sign in to get started.
          </p>
        </div>
        <button
          className="w-full rounded bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          onClick={onGetStarted}
          type="button"
        >
          Get Started
        </button>
      </div>
    </main>
  )
}

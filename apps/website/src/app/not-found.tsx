import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm text-center">
        <h2 className="mb-2 text-lg font-semibold">Page not found</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}

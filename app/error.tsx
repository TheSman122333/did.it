"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <p className="text-ink-muted">Something went wrong.</p>
      <button onClick={reset} className="btn-secondary">
        Try again
      </button>
    </main>
  );
}

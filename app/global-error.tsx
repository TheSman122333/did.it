"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center font-sans">
        <p className="text-ink-muted">Something went wrong.</p>
        <button onClick={reset} className="btn-secondary">
          Try again
        </button>
      </body>
    </html>
  );
}

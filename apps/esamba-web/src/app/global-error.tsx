"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={() => reset()}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}

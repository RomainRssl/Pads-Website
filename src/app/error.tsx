"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark">
      <div className="max-w-md mx-auto px-6 text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="font-heading text-2xl font-bold text-white mb-2">
          Une erreur est survenue
        </h1>
        <p className="text-brand-muted text-sm mb-2">{error.message}</p>
        {error.digest && (
          <p className="text-brand-muted/50 text-xs font-mono mb-6">
            Digest: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-brand-orange hover:bg-brand-orange/80 text-white text-sm font-semibold transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

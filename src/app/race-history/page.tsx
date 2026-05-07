import { Suspense } from 'react';
import RaceHistoryContent from '@/components/race-history/RaceHistoryContent';

export default function RaceHistoryPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-brand-text mb-3">
            Historique des Courses
          </h1>
          <p className="text-brand-muted text-lg">
            Consultez tous les résultats et statistiques des courses passées.
          </p>
        </div>

        <Suspense fallback={<LoadingState />}>
          <RaceHistoryContent />
        </Suspense>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-brand-surface border border-brand-border rounded-lg p-4 animate-pulse">
          <div className="h-6 bg-brand-border rounded w-1/3 mb-2" />
          <div className="h-4 bg-brand-border rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

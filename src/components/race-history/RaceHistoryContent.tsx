'use client';

import { useEffect, useState } from 'react';
import RaceHistoryCard from './RaceHistoryCard';

interface RaceHistoryItem {
  id: string;
  title: string;
  date: string;
  track: string;
  image?: string;
  createdAt: string;
}

export default function RaceHistoryContent() {
  const [races, setRaces] = useState<RaceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRaceHistory() {
      try {
        const res = await fetch('/api/race-history');
        if (!res.ok) throw new Error('Failed to fetch race history');
        const data = await res.json();
        setRaces(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    }

    fetchRaceHistory();
  }, []);

  if (loading) {
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

  if (error) {
    return (
      <div className="bg-brand-orange/10 border border-brand-orange/30 rounded-lg p-4 text-brand-orange">
        {error}
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-lg p-12 text-center">
        <p className="text-brand-muted text-lg">Aucune course n'a été enregistrée pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {races.map((race) => (
        <RaceHistoryCard key={race.id} race={race} />
      ))}
    </div>
  );
}

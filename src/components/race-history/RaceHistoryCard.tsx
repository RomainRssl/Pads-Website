'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import RaceResultsTable from './RaceResultsTable';
import { useSession } from 'next-auth/react';

interface RaceHistoryItem {
  id: string;
  title: string;
  date: string;
  track: string;
  image?: string;
  createdAt: string;
}

interface RaceHistoryCardProps {
  race: RaceHistoryItem;
}

export default function RaceHistoryCard({ race }: RaceHistoryCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { data: session } = useSession();

  const formattedDate = new Date(race.date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleOpen = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (!results) {
      setLoading(true);
      try {
        const res = await fetch(`/api/race-history/${race.id}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
        }
      } catch (err) {
        console.error('Failed to fetch results:', err);
      } finally {
        setLoading(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleDelete = async () => {
    if (!confirm('Voulez-vous vraiment supprimer cette course ?')) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/race-history/${race.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to delete race:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden hover:border-brand-orange/50 transition-colors">
      <button
        onClick={handleOpen}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-brand-bg transition-colors"
      >
        <div className="text-left flex-1">
          <h3 className="text-lg font-semibold text-brand-text mb-1">
            {race.title}
          </h3>
          <p className="text-sm text-brand-muted">
            {formattedDate} • {race.track}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {session?.user?.role === 'ADMIN' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={deleteLoading}
              className="p-2 hover:bg-red-500/10 rounded transition-colors text-red-500 disabled:opacity-50"
              title="Supprimer cette course"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <ChevronDown
            className={`w-5 h-5 text-brand-muted transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-brand-border px-6 py-4">
          {race.image && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img
                src={race.image}
                alt={race.title}
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-brand-muted">
              Chargement des résultats...
            </div>
          ) : results ? (
            <RaceResultsTable results={results} />
          ) : (
            <div className="text-center py-8 text-brand-muted">
              Aucun résultat disponible
            </div>
          )}
        </div>
      )}
    </div>
  );
}

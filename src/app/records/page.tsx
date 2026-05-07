"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TrackRecord {
  carClass: string;
  circuit: string;
  constructor: string;
  piloteName: string;
  bestLapTime: number;
  raceDate: string;
}

interface RecordsData {
  records: Record<string, TrackRecord[]>;
}

function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR");
}

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch("/api/records");
        if (!res.ok) throw new Error("Erreur lors du chargement des records");
        const data = await res.json();
        setRecords(data);
        // Set first class as default selected
        const classes = Object.keys(data.records);
        if (classes.length > 0) {
          setSelectedClass(classes[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark pt-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-10 w-40 bg-brand-border rounded-lg animate-pulse mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-brand-border rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-dark pt-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Records</h1>
          <div className="p-4 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!records || Object.keys(records.records).length === 0) {
    return (
      <div className="min-h-screen bg-brand-dark pt-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Records</h1>
          <div className="p-4 rounded-lg bg-brand-surface border border-brand-border text-brand-muted">
            Aucun record pour le moment.
          </div>
        </div>
      </div>
    );
  }

  const classes = Object.keys(records.records).sort();
  const currentClassRecords = selectedClass ? records.records[selectedClass] || [] : [];

  return (
    <div className="min-h-screen bg-brand-dark pt-24 px-4 sm:px-6 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-brand-orange hover:text-brand-orange/80 text-sm mb-4 inline-block transition-colors"
          >
            ← Accueil
          </Link>
          <h1 className="text-4xl font-bold text-white font-heading tracking-wide">
            Records Mondiaux
          </h1>
          <p className="text-brand-muted mt-2">
            Meilleur temps par classe et circuit
          </p>
        </div>

        {/* Class Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {classes.map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedClass === cls
                  ? "bg-brand-orange text-white"
                  : "bg-brand-surface border border-brand-border text-brand-muted hover:text-white"
              }`}
            >
              {cls}
            </button>
          ))}
        </div>

        {/* Records Table */}
        {currentClassRecords.length === 0 ? (
          <div className="p-4 rounded-lg bg-brand-surface border border-brand-border text-brand-muted">
            Aucun record dans cette classe.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-brand-border">
            <table className="w-full">
              <thead>
                <tr className="bg-brand-surface/50 border-b border-brand-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-brand-text">
                    Circuit
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-brand-text">
                    Constructeur
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-brand-text">
                    Pilote
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-brand-text">
                    Temps
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-brand-text">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {currentClassRecords.map((record, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-brand-surface/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-brand-text font-medium">
                      {record.circuit}
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-muted">
                      {record.constructor || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-muted">
                      {record.piloteName}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-brand-orange font-semibold">
                      {formatLapTime(record.bestLapTime)}
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-muted">
                      {formatDate(record.raceDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

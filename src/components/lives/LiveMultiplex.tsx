"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

interface StreamerStatus {
  id: string;
  login: string;
  displayName: string;
  profileImageUrl: string;
  isLive: boolean;
  stream?: {
    title: string;
    viewerCount: number;
    gameName: string;
    thumbnailUrl: string;
  };
}

interface Props {
  initialUsernames: string[];
}

const MAX_STREAMS = 10;
const REFRESH_INTERVAL = 60_000; // 60 seconds

/** Résout le domaine Twitch parent.
 *  Priorité : NEXT_PUBLIC_SITE_DOMAIN (env) → window.location.hostname → localhost
 *  Les adresses IP sont rejetées par Twitch : toujours utiliser un nom de domaine. */
function getTwitchParent(): string {
  const envDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN;
  if (envDomain && envDomain !== "localhost") return envDomain;
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    // Twitch n'accepte pas les adresses IP comme parent
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(h);
    if (!isIp) return h;
  }
  return "localhost";
}

function gridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2 lg:grid-cols-2";
  if (count <= 6) return "grid-cols-2 lg:grid-cols-3";
  return "grid-cols-2 lg:grid-cols-4 xl:grid-cols-5";
}

export default function LiveMultiplex({ initialUsernames }: Props) {
  const [streamers, setStreamers] = useState<StreamerStatus[]>(
    initialUsernames.map((u) => ({
      id: u,
      login: u,
      displayName: u,
      profileImageUrl: "",
      isLive: false,
    }))
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch("/api/twitch/live");
      if (!res.ok) return;
      const data = await res.json();
      setStreamers(data.streamers ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLive]);

  function toggleStreamer(login: string) {
    setSelected((prev) => {
      if (prev.includes(login)) return prev.filter((s) => s !== login);
      if (prev.length >= MAX_STREAMS) return prev; // max reached
      return [...prev, login];
    });
  }

  function removeStream(login: string) {
    setSelected((prev) => prev.filter((s) => s !== login));
  }

  const liveStreamers = streamers.filter((s) => s.isLive);
  const offlineStreamers = streamers.filter((s) => !s.isLive);

  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-4rem)]">
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-72 lg:shrink-0 bg-brand-surface border-b lg:border-b-0 lg:border-r border-brand-border">
        <div className="p-4 border-b border-brand-border">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Streamers</h2>
            <div className="flex items-center gap-2">
              {loading ? (
                <div className="w-16 h-4 rounded bg-brand-border animate-pulse" />
              ) : (
                <span className="text-xs text-brand-muted">
                  {liveStreamers.length > 0 ? (
                    <span className="text-green-400 font-semibold">
                      {liveStreamers.length} en live
                    </span>
                  ) : (
                    "Aucun live"
                  )}
                </span>
              )}
            </div>
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-brand-muted mt-1">
              {selected.length}/{MAX_STREAMS} stream{selected.length > 1 ? "s" : ""} actif
              {selected.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="overflow-y-auto lg:max-h-[calc(100vh-8rem)]">
          {/* Live streamers */}
          {liveStreamers.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-brand-muted uppercase tracking-wider">
                En live
              </p>
              {liveStreamers.map((s) => (
                <StreamerRow
                  key={s.login}
                  streamer={s}
                  isSelected={selected.includes(s.login)}
                  canAdd={selected.length < MAX_STREAMS}
                  onToggle={() => toggleStreamer(s.login)}
                />
              ))}
            </div>
          )}

          {/* Offline streamers */}
          {offlineStreamers.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-brand-muted uppercase tracking-wider">
                Hors ligne
              </p>
              {offlineStreamers.map((s) => (
                <StreamerRow
                  key={s.login}
                  streamer={s}
                  isSelected={selected.includes(s.login)}
                  canAdd={selected.length < MAX_STREAMS}
                  onToggle={() => toggleStreamer(s.login)}
                />
              ))}
            </div>
          )}

          {streamers.length === 0 && !loading && (
            <p className="p-4 text-brand-muted text-sm">
              Aucun streamer enregistré.
            </p>
          )}
        </div>
      </aside>

      {/* ── Multiplex grid ─────────────────────────────────────────────── */}
      <main className="flex-1 bg-brand-dark p-3 lg:p-4">
        {selected.length === 0 ? (
          <EmptyState liveCount={liveStreamers.length} />
        ) : (
          <div className={`grid ${gridClass(selected.length)} gap-3 h-full`}>
            {selected.map((login) => {
              const info = streamers.find((s) => s.login === login);
              return (
                <StreamEmbed
                  key={login}
                  login={login}
                  displayName={info?.displayName ?? login}
                  isLive={info?.isLive ?? false}
                  title={info?.stream?.title}
                  viewerCount={info?.stream?.viewerCount}
                  onClose={() => removeStream(login)}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// ── StreamerRow ──────────────────────────────────────────────────────────────

interface RowProps {
  streamer: StreamerStatus;
  isSelected: boolean;
  canAdd: boolean;
  onToggle: () => void;
}

function StreamerRow({ streamer, isSelected, canAdd, onToggle }: RowProps) {
  const disabled = !isSelected && !canAdd;

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
        ${isSelected ? "bg-brand-orange/10 border-l-2 border-brand-orange" : "border-l-2 border-transparent"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-brand-border/50 cursor-pointer"}
      `}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {streamer.profileImageUrl ? (
          <Image
            src={streamer.profileImageUrl}
            alt={streamer.displayName}
            width={36}
            height={36}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-discord flex items-center justify-center text-white text-sm font-bold">
            {streamer.displayName[0]?.toUpperCase()}
          </div>
        )}
        {streamer.isLive && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-brand-surface" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-text truncate">
          {streamer.displayName}
        </p>
        {streamer.isLive && streamer.stream ? (
          <p className="text-xs text-green-400 truncate">
            {streamer.stream.viewerCount.toLocaleString("fr-FR")} spectateurs
          </p>
        ) : (
          <p className="text-xs text-brand-muted">Hors ligne</p>
        )}
      </div>

      {/* Status pill */}
      {isSelected ? (
        <span className="shrink-0 text-xs font-semibold text-brand-orange">✓ Actif</span>
      ) : streamer.isLive ? (
        <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-bold bg-red-500 text-white">
          LIVE
        </span>
      ) : null}
    </button>
  );
}

// ── StreamEmbed ──────────────────────────────────────────────────────────────

interface EmbedProps {
  login: string;
  displayName: string;
  isLive: boolean;
  title?: string;
  viewerCount?: number;
  onClose: () => void;
}

function StreamEmbed({ login, displayName, isLive, title, viewerCount, onClose }: EmbedProps) {
  const src = `https://player.twitch.tv/?channel=${login}&parent=${getTwitchParent()}&autoplay=false`;

  return (
    <div className="relative flex flex-col bg-black rounded-lg overflow-hidden border border-brand-border min-h-0">
      {/* Stream header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-brand-surface/80 backdrop-blur-sm shrink-0">
        {isLive && (
          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-500 text-white shrink-0">
            LIVE
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          {title && <p className="text-xs text-brand-muted truncate">{title}</p>}
        </div>
        {viewerCount !== undefined && (
          <span className="text-xs text-brand-muted shrink-0">
            👁 {viewerCount.toLocaleString("fr-FR")}
          </span>
        )}
        <button
          onClick={onClose}
          className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-brand-muted hover:text-white hover:bg-brand-orange/20 transition-colors text-lg leading-none"
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      {/* Twitch iframe */}
      <div className="relative flex-1 aspect-video">
        <iframe
          src={src}
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          title={`Stream de ${displayName}`}
        />
      </div>
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ liveCount }: { liveCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 text-center px-4">
      <p className="text-6xl mb-4">📺</p>
      <h3 className="font-heading text-2xl font-bold text-white mb-2">
        Multiplex
      </h3>
      {liveCount > 0 ? (
        <p className="text-brand-muted max-w-sm">
          <span className="text-green-400 font-semibold">{liveCount} streamer{liveCount > 1 ? "s" : ""} en live</span> —
          cliquez sur un nom dans la liste pour ouvrir son stream.
          <br />
          <span className="text-sm mt-1 block">Jusqu'à {MAX_STREAMS} streams simultanés.</span>
        </p>
      ) : (
        <p className="text-brand-muted max-w-sm">
          Aucun membre n'est en live pour le moment.
          <br />
          <span className="text-sm mt-1 block">Revenez plus tard ou sélectionnez un streamer hors ligne.</span>
        </p>
      )}
    </div>
  );
}

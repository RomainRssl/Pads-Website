"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ENDURANCE_CAR_CLASS_LABELS, type EnduranceCarClass } from "@/lib/endurance";

interface GroupMember {
  id: string;
  userId: string;
  status: string;
  user: { id: string; name: string | null; image: string | null };
}

interface GroupDetail {
  id: string;
  teamName: string;
  carClass: string;
  startTime: string;
  endTime: string;
  status: string;
  enduranceId: string;
  endurance: { title: string; track: string };
  members: GroupMember[];
}

function fmt(d: string): string {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
}

export default function GroupConfirm({ groupId }: { groupId: string }) {
  const { data: session } = useSession();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  function load() {
    fetch(`/api/endurance/groups/${groupId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Équipage introuvable");
        setGroup(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [groupId]);

  async function handleConfirm() {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/endurance/groups/${groupId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Annuler cet équipage ? Les créneaux de tous les membres redeviendront disponibles.")) return;
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/endurance/groups/${groupId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return <div className="h-40 rounded-xl bg-brand-border animate-pulse" />;
  }

  if (error && !group) {
    return (
      <div className="p-4 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-sm">
        {error}
      </div>
    );
  }

  if (!group) return null;

  const myMember = group.members.find((m) => m.userId === session?.user?.id);

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-5">
      <div>
        <Link href={`/endurance/${group.enduranceId}`} className="text-xs text-brand-muted hover:text-brand-text transition-colors">
          ← {group.endurance.title}
        </Link>
        <h1 className="font-heading text-xl font-bold text-white mt-2">{group.teamName}</h1>
        <p className="text-sm text-brand-muted">
          {ENDURANCE_CAR_CLASS_LABELS[group.carClass as EnduranceCarClass] ?? group.carClass} · {group.endurance.track}
        </p>
        <p className="text-xs text-brand-muted mt-1">{fmt(group.startTime)} → {fmt(group.endTime)}</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs">
          {error}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-brand-muted mb-2">Équipage</p>
        <div className="space-y-1.5">
          {group.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-brand-border">
              <span className="text-sm text-brand-text">{m.user.name ?? "Pilote"}{m.userId === session?.user?.id && " (moi)"}</span>
              <span className={`text-xs ${m.status === "CONFIRMED" ? "text-green-400" : "text-brand-muted"}`}>
                {m.status === "CONFIRMED" ? "✓ Confirmé" : "En attente"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {group.status === "CANCELLED" ? (
        <p className="text-sm text-brand-red">Cet équipage a été annulé.</p>
      ) : group.status === "CONFIRMED" ? (
        <p className="text-sm text-green-400">✓ Équipage confirmé, à retrouver sur le calendrier.</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          {myMember && myMember.status !== "CONFIRMED" && (
            <button
              onClick={handleConfirm}
              disabled={acting}
              className="flex-1 py-2.5 rounded-lg bg-brand-orange hover:bg-brand-orange/80 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {acting ? "…" : "✓ Confirmer ma participation"}
            </button>
          )}
          {myMember && (
            <button
              onClick={handleCancel}
              disabled={acting}
              className="flex-1 py-2.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-red hover:border-brand-red disabled:opacity-50 text-sm font-medium transition-colors"
            >
              Annuler l&apos;équipage (imprévu)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

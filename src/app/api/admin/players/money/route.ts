// src/app/api/admin/players/money/route.ts
//
// PATCH /api/admin/players/money
//
// Appelé par le bot Discord R2D12 pour ajouter ou retirer des Crédits
// à un pilote identifié par son username (nom de la fiche pilote).
//
// Authentification : Bearer token via la variable d'environnement BOT_API_SECRET
// (à ajouter dans .env.local et sur le VPS)
//
// Body JSON attendu :
//   { "username": "R Lupa", "delta": 5000, "reason": "Victoire course #3" }
//
//   delta > 0 → ajout
//   delta < 0 → retrait
//
// Réponse 200 :
//   { "ok": true, "username": "R Lupa", "oldBalance": 73000, "newBalance": 78000 }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const BodySchema = z.object({
  username: z.string().min(1),
  delta: z.number().int().refine((n) => n !== 0, { message: "delta ne peut pas être 0" }),
  reason: z.string().optional(),
});

export async function PATCH(req: Request) {
  // ── Auth : vérifier le Bearer token du bot ──────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = process.env.BOT_API_SECRET;

  if (!secret) {
    console.error("[money] BOT_API_SECRET non défini dans les variables d'environnement");
    return NextResponse.json({ error: "Configuration serveur manquante." }, { status: 500 });
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // ── Validation du body ──────────────────────────────────────────────────
  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    body = BodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Body invalide." },
      { status: 400 }
    );
  }

  const { username, delta, reason } = body;

  // ── Recherche du joueur (insensible à la casse) ─────────────────────────
  const players = await prisma.player.findMany();
  const player = players.find(
    (p) => p.username.toLowerCase() === username.toLowerCase()
  );

  if (!player) {
    return NextResponse.json(
      { error: `Pilote "${username}" introuvable en base.` },
      { status: 404 }
    );
  }

  const oldBalance = player.money;
  const newBalance = oldBalance + delta;

  // Bloquer si le solde deviendrait négatif
  if (newBalance < 0) {
    return NextResponse.json(
      {
        error: `Solde insuffisant. Solde actuel : ${oldBalance} Crédits, retrait demandé : ${Math.abs(delta)} Crédits.`,
        currentBalance: oldBalance,
      },
      { status: 422 }
    );
  }

  // ── Mise à jour ─────────────────────────────────────────────────────────
  await prisma.player.update({
    where: { id: player.id },
    data: { money: newBalance },
  });

  console.log(
    `[money] ${delta > 0 ? "+" : ""}${delta} Crédits pour "${player.username}" | ${oldBalance} → ${newBalance} | raison : ${reason ?? "—"}`
  );

  return NextResponse.json({
    ok: true,
    username: player.username,
    oldBalance,
    newBalance,
    delta,
    reason: reason ?? null,
  });
}

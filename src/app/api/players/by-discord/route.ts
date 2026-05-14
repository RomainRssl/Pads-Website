import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function computeTier(
  classXp: number,
  configs: { label: string; minXp: number }[]
): string | null {
  // configs sorted desc by minXp — return the label of the highest tier reached
  for (const cfg of configs) {
    if (classXp >= cfg.minXp) return cfg.label;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-bot-secret");
  if (!secret || secret !== process.env.BOT_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("discordIds");
  if (!raw) {
    return NextResponse.json({ error: "discordIds requis" }, { status: 400 });
  }

  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  const [players, licenseConfigs] = await Promise.all([
    prisma.player.findMany({
      where: { discordId: { in: ids } },
      include: { classStats: true },
    }),
    prisma.licenseConfig.findMany({ orderBy: { minXp: "desc" } }),
  ]);

  const result = players.map((p) => ({
    discordId: p.discordId,
    username: p.username,
    classStats: p.classStats.map((cs) => ({
      carClass: cs.carClass,
      ladderPoints: cs.ladderPoints,
      xpTierName: computeTier(cs.classXp, licenseConfigs),
    })),
  }));

  return NextResponse.json(result);
}

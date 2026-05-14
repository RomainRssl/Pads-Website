import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function computeTier(
  classXp: number,
  configs: { label: string; minXp: number }[]
): string | null {
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

  const carClass = req.nextUrl.searchParams.get("carClass");
  if (!carClass) {
    return NextResponse.json({ error: "carClass requis" }, { status: 400 });
  }

  const [stats, licenseConfigs] = await Promise.all([
    prisma.playerClassStats.findMany({
      where: { carClass },
      orderBy: { ladderPoints: "desc" },
      include: {
        player: { select: { discordId: true, username: true } },
      },
    }),
    prisma.licenseConfig.findMany({ orderBy: { minXp: "desc" } }),
  ]);

  const result = stats.map((s) => ({
    discordId: s.player.discordId,
    username: s.player.username,
    ladderPoints: s.ladderPoints,
    xpTierName: computeTier(s.classXp, licenseConfigs),
  }));

  return NextResponse.json(result);
}

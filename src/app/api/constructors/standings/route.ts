import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const standings = await prisma.constructorStandings.findMany({
      orderBy: [
        { carClass: "asc" },
        { seasonPoints: "desc" },
      ],
    });

    // Group by carClass
    const grouped: Record<string, any[]> = {};
    for (const standing of standings) {
      if (!grouped[standing.carClass]) {
        grouped[standing.carClass] = [];
      }
      grouped[standing.carClass].push({
        position: grouped[standing.carClass].length + 1,
        constructor: standing.constructorName,
        seasonPoints: standing.seasonPoints,
        raceCount: standing.raceCount,
      });
    }

    return NextResponse.json({ standings: grouped });
  } catch (err) {
    console.error("[constructors/standings] Error:", err);
    return NextResponse.json(
      { error: "Erreur lors du chargement des classements" },
      { status: 500 }
    );
  }
}

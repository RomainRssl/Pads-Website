import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const records = await prisma.trackRecord.findMany({
      orderBy: [
        { carClass: "asc" },
        { circuit: "asc" },
      ],
    });

    // Group by carClass for easier frontend processing
    const grouped: Record<string, any[]> = {};
    for (const record of records) {
      if (!grouped[record.carClass]) {
        grouped[record.carClass] = [];
      }
      grouped[record.carClass].push({
        carClass: record.carClass,
        circuit: record.circuit,
        constructor: record.constructorName,
        piloteName: record.piloteName,
        bestLapTime: record.bestLapTime,
        raceDate: record.raceDate,
      });
    }

    return NextResponse.json({ records: grouped });
  } catch (err) {
    console.error("[records] Error:", err);
    return NextResponse.json(
      { error: "Erreur lors du chargement des records" },
      { status: 500 }
    );
  }
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function checkBearerToken(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  return !!token && token === process.env.BOT_API_SECRET;
}

/** Returns upcoming events not yet closed — for the bot's auto-close loop. */
export async function GET(req: Request) {
  if (!checkBearerToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    where: {
      date: { gte: new Date() },
      registrationsClosed: false,
    },
    select: {
      id: true,
      title: true,
      date: true,
      closeOffsetHours: true,
      registrationsClosed: true,
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(events);
}

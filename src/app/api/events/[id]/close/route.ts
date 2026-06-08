import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { buildSplits } from "@/lib/splits";
import { getCircuitCapacity } from "@/lib/circuit-capacity";

function checkBearerToken(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  return !!token && token === process.env.BOT_API_SECRET;
}

// ── Response formatter ────────────────────────────────────────────────────────

function formatSplitsResponse(
  event: { id: string; title: string; date: Date },
  splits: Array<{
    index: number;
    label: string;
    serverName: string;
    password: string;
    total: number;
    entries: Array<{ carClass: string; driverName: string; discordId: string | null }>;
  }>,
) {
  return {
    raceId: event.id,
    raceName: event.title,
    startTime: event.date,
    splits: splits.map((s) => {
      const classBuckets = new Map<string, { pseudoLmu: string; discordId: string | null }[]>();
      for (const e of s.entries) {
        if (!classBuckets.has(e.carClass)) classBuckets.set(e.carClass, []);
        classBuckets.get(e.carClass)!.push({ pseudoLmu: e.driverName, discordId: e.discordId });
      }
      return {
        index: s.index,
        label: s.label,
        serverName: s.serverName,
        password: s.password,
        total: s.total,
        classes: Array.from(classBuckets.entries()).map(([className, drivers]) => ({
          className,
          drivers,
        })),
      };
    }),
  };
}

// ── POST /api/events/[id]/close ───────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkBearerToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { user: { select: { id: true, name: true, discordId: true } } },
      },
      splits: {
        include: { entries: true },
        orderBy: { index: "asc" },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // ── Idempotence ───────────────────────────────────────────────────────────
  if (event.registrationsClosed && event.splits.length > 0) {
    return NextResponse.json(formatSplitsResponse(event, event.splits));
  }

  // ── Manual mode: just close registrations, no auto splits ────────────────
  if (event.splitMode === "MANUAL") {
    await prisma.event.update({ where: { id }, data: { registrationsClosed: true } });
    return NextResponse.json({ raceId: event.id, raceName: event.title, startTime: event.date, splits: [] });
  }

  // ── Close registrations ───────────────────────────────────────────────────
  await prisma.event.update({ where: { id }, data: { registrationsClosed: true } });

  // ── Build ordered class lists (part D) ────────────────────────────────────
  let carClasses: { name: string }[] = [];
  try { carClasses = JSON.parse(event.cars); } catch { /* ignore */ }

  const classNames = carClasses.map((c) => c.name);

  // Discord IDs of all registered users (some may be null if user hasn't linked Discord)
  const registeredDiscordIds = event.registrations
    .map((r) => r.user.discordId)
    .filter((d): d is string => d != null);

  // Fetch ladder rankings for relevant classes — join via Player.discordId
  const classStats = await prisma.playerClassStats.findMany({
    where: {
      carClass: { in: classNames },
      player: { discordId: { in: registeredDiscordIds } },
    },
    orderBy: { ladderPoints: "desc" },
    select: {
      carClass: true,
      ladderPoints: true,
      player: { select: { discordId: true, username: true } },
    },
  });

  // discordId -> { ladderPoints, pseudoLmu } per class
  // classLadder[className][discordId] = { ladderPoints, pseudoLmu }
  type LadderEntry = { ladderPoints: number; pseudoLmu: string };
  const classLadder = new Map<string, Map<string, LadderEntry>>();
  for (const stat of classStats) {
    const did = stat.player.discordId!;
    if (!classLadder.has(stat.carClass)) classLadder.set(stat.carClass, new Map());
    classLadder.get(stat.carClass)!.set(did, {
      ladderPoints: stat.ladderPoints,
      pseudoLmu: stat.player.username,
    });
  }

  const serverBase = event.serverBase ?? event.serverName ?? "Par amour du spin";
  const passwordBase = event.passwordBase ?? event.serverPassword ?? "pass";
  const capacity = getCircuitCapacity(event.track);

  const classInputs = classNames.map((className) => {
    const regs = event.registrations.filter((r) => r.carClass === className);
    const ladder = classLadder.get(className) ?? new Map<string, LadderEntry>();

    // Ranked drivers (present in classement)
    const ranked = regs
      .filter((r) => r.user.discordId && ladder.has(r.user.discordId))
      .map((r) => {
        const entry = ladder.get(r.user.discordId!)!;
        return { discordId: r.user.discordId!, pseudoLmu: entry.pseudoLmu, ladderPoints: entry.ladderPoints };
      })
      .sort((a, b) => b.ladderPoints - a.ladderPoints);

    // Unranked drivers go at the end (absent from classement)
    const unranked = regs
      .filter((r) => !r.user.discordId || !ladder.has(r.user.discordId!))
      .map((r) => ({
        discordId: r.user.discordId ?? null,
        pseudoLmu: r.user.name ?? r.userId,
        ladderPoints: -1,
      }));

    const drivers = [...ranked, ...unranked].map(({ discordId, pseudoLmu }) => ({
      discordId,
      pseudoLmu,
    }));

    return { className, drivers };
  });

  // ── Apply split mode ──────────────────────────────────────────────────────
  const classInputsForBuild = event.splitMode === "RANDOM"
    ? classInputs.map((c) => ({
        ...c,
        drivers: [...c.drivers].sort(() => Math.random() - 0.5),
      }))
    : classInputs;

  const splitResults = buildSplits(classInputsForBuild, capacity, serverBase, passwordBase);

  // ── Persist splits ────────────────────────────────────────────────────────
  const createdSplits = await prisma.$transaction(
    splitResults.map((s) =>
      prisma.split.create({
        data: {
          eventId: id,
          index: s.index,
          label: s.label,
          serverName: s.serverName,
          password: s.password,
          total: s.total,
          entries: {
            create: s.classes.flatMap((sc) =>
              sc.drivers.map((d) => ({
                // userId is required — resolve from registrations map
                userId: event.registrations.find(
                  (r) => (d.discordId ? r.user.discordId === d.discordId : r.user.name === d.pseudoLmu),
                )?.userId ?? "",
                carClass: sc.className,
                driverName: d.pseudoLmu,
                discordId: d.discordId ?? null,
              })),
            ),
          },
        },
        include: { entries: true },
      }),
    ),
  );

  return NextResponse.json(formatSplitsResponse(event, createdSplits));
}

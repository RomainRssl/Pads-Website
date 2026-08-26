import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGuildConfig } from "@/lib/config";
import { mediaAbsPath } from "@/lib/media";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";

// ── Publier l'affiche sur Discord (webhook existant) ─────────────────────────

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Course introuvable." }, { status: 404 });
  }
  if (event.posterStatus !== "READY" || !event.posterPath) {
    return NextResponse.json(
      { error: "L'affiche n'est pas prête — générez-la d'abord." },
      { status: 400 }
    );
  }

  const config = await getGuildConfig();
  const webhookUrl = config?.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Aucun webhook Discord configuré." },
      { status: 400 }
    );
  }

  let png: Buffer;
  try {
    png = await readFile(mediaAbsPath(event.posterPath));
  } catch {
    return NextResponse.json(
      { error: "Fichier d'affiche introuvable sur le disque." },
      { status: 500 }
    );
  }

  const form = new FormData();
  form.append(
    "payload_json",
    JSON.stringify({
      username: "Spin Bot",
      content: `🏁 **${event.title}** — l'affiche officielle est là !`,
    })
  );
  form.append(
    "files[0]",
    new Blob([new Uint8Array(png)], { type: "image/png" }),
    `affiche-${event.id}.png`
  );

  const response = await fetch(webhookUrl, { method: "POST", body: form });
  if (!response.ok) {
    return NextResponse.json(
      { error: `Discord a refusé l'envoi (${response.status}).` },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

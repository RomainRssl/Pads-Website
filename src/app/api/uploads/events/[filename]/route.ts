import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, basename } from "path";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "events");

const MIME: Record<string, string> = {
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  webp: "image/webp",
  gif:  "image/gif",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitise: strip any path traversal, keep only the bare filename
  const safe = basename(filename);
  const ext  = safe.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext];

  if (!mime) {
    return NextResponse.json({ error: "Format non supporté." }, { status: 400 });
  }

  try {
    const buffer = await readFile(join(UPLOAD_DIR, safe));
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}

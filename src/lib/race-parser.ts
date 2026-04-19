export interface RawEntry {
  username: string;
  position: number;
  isClean: boolean;
}

function normalizeBoolean(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
  if (typeof val === "number") return val === 1;
  return true; // default: clean race
}

export function parseJSON(text: string): RawEntry[] {
  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error("Le fichier JSON doit contenir un tableau.");

  return raw.map((entry, i) => {
    if (typeof entry.username !== "string" || !entry.username.trim()) {
      throw new Error(`Entrée #${i + 1} : champ "username" manquant ou invalide.`);
    }
    const pos = Number(entry.position);
    if (!Number.isInteger(pos) || pos < 1) {
      throw new Error(`Entrée #${i + 1} : champ "position" manquant ou invalide.`);
    }
    return {
      username: entry.username.trim(),
      position: pos,
      isClean: normalizeBoolean(entry.isClean),
    };
  });
}

export function parseCSV(text: string): RawEntry[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) throw new Error("Le fichier CSV doit contenir un en-tête et au moins une ligne.");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const posIdx = headers.indexOf("position");
  const userIdx = headers.indexOf("username");
  const cleanIdx = headers.indexOf("isclean");

  if (posIdx === -1 || userIdx === -1) {
    throw new Error('Le CSV doit avoir les colonnes "position" et "username".');
  }

  return lines.slice(1).map((line, i) => {
    const cols = line.split(",").map((c) => c.trim());
    const pos = parseInt(cols[posIdx], 10);
    if (isNaN(pos) || pos < 1) throw new Error(`Ligne ${i + 2} : position invalide.`);
    const username = cols[userIdx];
    if (!username) throw new Error(`Ligne ${i + 2} : username manquant.`);
    return {
      username,
      position: pos,
      isClean: cleanIdx !== -1 ? normalizeBoolean(cols[cleanIdx]) : true,
    };
  });
}

export function parseFile(filename: string, text: string): RawEntry[] {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "json") return parseJSON(text);
  if (ext === "csv") return parseCSV(text);
  throw new Error("Format non supporté. Utilisez .json ou .csv.");
}

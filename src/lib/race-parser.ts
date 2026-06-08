// ── Core types ────────────────────────────────────────────────────────────────

export interface RawEntry {
  username: string;
  position: number;
  isClean: boolean;
  incidents: number; // nombre d'incidents extraits du XML (défaut 0)
}

// ── Incident breakdown types ──────────────────────────────────────────────────

export type IncidentCounts = { offtrack: number; contact: number; avert: number; sanction: number };

/** One side of a player-vs-player contact, already paired with opponent force */
export interface RawPlayerContact {
  opponent: string;
  myForce: number;
  opponentForce: number;
}

export interface RawDriverIncidentData {
  offtrackWarnings: number;           // TrackLimits with WarningPoints > 0
  immovableContacts: number;          // Incidents "with Immovable"
  playerContacts: RawPlayerContact[]; // Paired: both forces known
}

export type IncidentBreakdown = Record<string, RawDriverIncidentData>;

/**
 * Applies formula thresholds to raw XML incident data to produce per-driver counts.
 * Normal case: lower force = at fault. High-force (> forceThreshold): higher force = at fault.
 */
export function classifyIncidentBreakdown(
  breakdown: IncidentBreakdown,
  thresholds: { avertRatioMin: number; sanctionRatioMin: number; forceThreshold: number; forceRatioMin: number }
): Record<string, IncidentCounts> {
  const result: Record<string, IncidentCounts> = {};
  const ensure = (name: string) => {
    if (!result[name]) result[name] = { offtrack: 0, contact: 0, avert: 0, sanction: 0 };
    return result[name];
  };

  for (const [driver, data] of Object.entries(breakdown)) {
    ensure(driver).offtrack = data.offtrackWarnings;
    ensure(driver).contact  = data.immovableContacts;

    for (const c of data.playerContacts) {
      const maxForce = Math.max(c.myForce, c.opponentForce);
      const minForce = Math.min(c.myForce, c.opponentForce);
      const ratio = minForce > 0 ? maxForce / minForce : 1;

      let severity: "avert" | "sanction" | "none" = "none";

      if (maxForce > thresholds.forceThreshold) {
        // High-force contact: higher force = at fault
        if (c.myForce >= c.opponentForce) {
          if (ratio >= thresholds.sanctionRatioMin) severity = "sanction";
          else if (ratio >= thresholds.forceRatioMin) severity = "avert";
        }
      } else {
        // Normal contact: lower force = at fault
        if (c.myForce <= c.opponentForce && ratio >= thresholds.avertRatioMin) {
          if (ratio >= thresholds.sanctionRatioMin) severity = "sanction";
          else severity = "avert";
        }
      }

      if (severity === "sanction") ensure(driver).sanction++;
      else if (severity === "avert") ensure(driver).avert++;
    }
  }

  return result;
}

/** Per-driver data for the preview UI (XML only fills extra fields) */
export interface ExtendedEntry extends RawEntry {
  carClass?: string;
  carNumber?: string;
  teamName?: string;
  laps?: number;
  bestLapTimeSec?: number | null; // null = no valid best lap
  finishStatus?: string;
  constructor?: string; // Extracted from CarType (e.g., "Mercedes", "Porsche")
}

/** Race-level metadata extracted from XML header */
export interface RaceMeta {
  trackVenue?: string;
  trackEvent?: string;
  trackLengthM?: number;
  raceTimeMin?: number;
  dateString?: string;
  sessionType?: "Race" | "Qualification" | "Practice" | "Unknown";
}

/** Full parser result — entries drive reward calc; extended + meta drive the preview */
export interface ParseResult {
  entries: RawEntry[];
  extended: ExtendedEntry[];
  meta: RaceMeta;
  incidentBreakdown?: IncidentBreakdown; // Only populated for XML files
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeBoolean(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
  if (typeof val === "number") return val === 1;
  return true;
}

function emptyMeta(): RaceMeta {
  return {};
}

// ── JSON parser ───────────────────────────────────────────────────────────────

export function parseJSON(text: string): ParseResult {
  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error("Le fichier JSON doit contenir un tableau.");

  const entries: RawEntry[] = raw.map((entry, i) => {
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
      incidents: typeof entry.incidents === "number" ? entry.incidents : 0,
    };
  });

  return {
    entries,
    extended: entries.map((e) => ({
      ...e,
      constructor: undefined,
    })),
    meta: emptyMeta(),
  };
}

// ── CSV parser ────────────────────────────────────────────────────────────────

export function parseCSV(text: string): ParseResult {
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

  const entries: RawEntry[] = lines.slice(1).map((line, i) => {
    const cols = line.split(",").map((c) => c.trim());
    const pos = parseInt(cols[posIdx], 10);
    if (isNaN(pos) || pos < 1) throw new Error(`Ligne ${i + 2} : position invalide.`);
    const username = cols[userIdx];
    if (!username) throw new Error(`Ligne ${i + 2} : username manquant.`);
    return {
      username,
      position: pos,
      isClean: cleanIdx !== -1 ? normalizeBoolean(cols[cleanIdx]) : true,
      incidents: 0,
    };
  });

  return {
    entries,
    extended: entries.map((e) => ({
      ...e,
      constructor: undefined,
    })),
    meta: emptyMeta(),
  };
}

// ── LMU XML parser ────────────────────────────────────────────────────────────
// Parses rFactor2 / Le Mans Ultimate result XML files.
// Header tags supply race metadata; <Driver> blocks supply per-driver stats.

function extractTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

/** Normalise les noms de classe LMU vers les valeurs attendues par CAR_CLASSES */
function normalizeCarClass(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const map: Record<string, string> = {
    "HYPER":      "HYPERCAR",
    "HYPERCAR":   "HYPERCAR",
    "GT3":        "LMGT3",
    "LMGT3":      "LMGT3",
    "GTE":        "GTE",
    "LMP2":       "LMP2",
    "LMP2_ELMS":  "LMP2",
    "LMP3":       "LMP3",
  };
  return map[raw.toUpperCase()] ?? raw;
}

/** Extract constructor name from CarType string */
function extractConstructor(carType: string | undefined): string | undefined {
  if (!carType) return undefined;

  const constructorMap: Record<string, string> = {
    "mercedes":    "Mercedes",
    "porsche":     "Porsche",
    "bmw":         "BMW",
    "ferrari":     "Ferrari",
    "lamborghini": "Lamborghini",
    "aston":       "Aston Martin",
    "chevrolet":   "Chevrolet",
    "corvette":    "Chevrolet",
    "lexus":       "Lexus",
    "mclaren":     "McLaren",
    "ford":        "Ford",
    "mustang":     "Ford",
    "oreca":       "Oreca",
    "ligier":      "Ligier",
    "ginetta":     "Ginetta",
    "duqueine":    "Duqueine",
    "isotta":      "Isotta Fraschini",
    "vanwall":     "Vanwall",
    "glickenhaus": "Glickenhaus",
    "genesis":     "Genesis",
    "cadillac":    "Cadillac",
    "peugeot":     "Peugeot",
    "toyota":      "Toyota",
    "alpine":      "Alpine",
  };

  const lowerCarType = carType.toLowerCase();

  for (const [key, value] of Object.entries(constructorMap)) {
    if (lowerCarType.includes(key)) {
      return value;
    }
  }

  return undefined;
}

function detectSessionType(text: string): RaceMeta["sessionType"] {
  if (/<RaceResults[\s>]/i.test(text)) return "Race";
  if (/<QualifyResults[\s>]/i.test(text)) return "Qualification";
  if (/<PracticeResults[\s>]/i.test(text)) return "Practice";
  return "Unknown";
}

export function parseXML(text: string): ParseResult {
  // ── Metadata from header ──
  const trackVenue   = extractTag(text, "TrackVenue") ?? undefined;
  const trackEvent   = extractTag(text, "TrackEvent") ?? undefined;
  const trackLengthRaw = extractTag(text, "TrackLength");
  const raceTimeRaw  = extractTag(text, "RaceTime");    // top-level configured time
  const minutesRaw   = extractTag(text, "Minutes");     // inside <Race> or <Qualify>
  const dateString   = extractTag(text, "TimeString") ?? undefined;
  const sessionType  = detectSessionType(text);

  const trackLengthM = trackLengthRaw ? parseFloat(trackLengthRaw) : undefined;
  const raceTimeMin  = raceTimeRaw
    ? parseInt(raceTimeRaw, 10)
    : minutesRaw
    ? parseInt(minutesRaw, 10)
    : undefined;

  const meta: RaceMeta = {
    trackVenue,
    trackEvent,
    trackLengthM: trackLengthM && !isNaN(trackLengthM) ? trackLengthM : undefined,
    raceTimeMin: raceTimeMin && !isNaN(raceTimeMin) ? raceTimeMin : undefined,
    dateString,
    sessionType,
  };

  // ── Per-driver entries ──
  const entries: RawEntry[] = [];
  const extended: ExtendedEntry[] = [];
  const driverRegex = /<Driver>([\s\S]*?)<\/Driver>/g;
  let match: RegExpExecArray | null;

  while ((match = driverRegex.exec(text)) !== null) {
    const block = match[1];

    const name   = extractTag(block, "Name");
    const posStr = extractTag(block, "Position");
    if (!name || !posStr) continue;

    const pos = parseInt(posStr, 10);
    if (isNaN(pos) || pos < 1) continue;

    const carClass     = normalizeCarClass(extractTag(block, "CarClass") ?? undefined);
    const carNumber    = extractTag(block, "CarNumber") ?? undefined;
    const carType      = extractTag(block, "CarType") ?? undefined;
    const constructor  = extractConstructor(carType);
    const rawTeamName  = extractTag(block, "TeamName");
    const teamName     = rawTeamName ? rawTeamName.replace(/\+/g, " ") : undefined;
    const lapsRaw      = extractTag(block, "Laps");
    const bestLapRaw   = extractTag(block, "BestLapTime");
    const finishStatus = extractTag(block, "FinishStatus") ?? undefined;

    const laps = lapsRaw ? parseInt(lapsRaw, 10) : undefined;
    const bestLapTimeSec = bestLapRaw
      ? (parseFloat(bestLapRaw) > 0 ? parseFloat(bestLapRaw) : null)
      : null;

    const incidentsRaw = extractTag(block, "Incidents");
    const incidents = incidentsRaw ? (parseInt(incidentsRaw, 10) || 0) : 0;

    const raw: RawEntry = { username: name, position: pos, isClean: true, incidents };
    const ext: ExtendedEntry = {
      ...raw,
      carClass,
      carNumber,
      teamName,
      laps: laps && !isNaN(laps) ? laps : undefined,
      bestLapTimeSec,
      finishStatus,
      constructor,
    };

    entries.push(raw);
    extended.push(ext);
  }

  if (entries.length === 0) {
    throw new Error(
      "Aucun pilote trouvé dans le fichier XML. Vérifiez que c'est bien un fichier de résultats LMU."
    );
  }

  // Sort by position ascending (XML order isn't guaranteed)
  const sorted = entries
    .map((e, i) => ({ e, x: extended[i] }))
    .sort((a, b) => a.e.position - b.e.position);

  // ── Incident breakdown from TrackLimits + Incident tags ──────────────────────
  const incidentBreakdown: IncidentBreakdown = {};
  const ensureDriver = (name: string) => {
    if (!incidentBreakdown[name]) {
      incidentBreakdown[name] = { offtrackWarnings: 0, immovableContacts: 0, playerContacts: [] };
    }
    return incidentBreakdown[name];
  };

  // TrackLimits: WarningPoints > 0 → offtrack warning for that driver
  const tlRegex = /<TrackLimits\s([^>]*)>/g;
  let tlMatch: RegExpExecArray | null;
  while ((tlMatch = tlRegex.exec(text)) !== null) {
    const attrs = tlMatch[1];
    const driverAttr = attrs.match(/\bDriver="([^"]*)"/);
    const wpAttr     = attrs.match(/\bWarningPoints="([^"]*)"/);
    if (driverAttr && wpAttr) {
      const wp = parseFloat(wpAttr[1]);
      if (wp > 0) ensureDriver(driverAttr[1]).offtrackWarnings++;
    }
  }

  // Incidents: first pass — build et::driver::opponent → force map for pairing
  const contactForceMap = new Map<string, number>();
  const incRegex = /<Incident\s+et="([^"]*)">(.*?)<\/Incident>/g;
  let incMatch: RegExpExecArray | null;
  while ((incMatch = incRegex.exec(text)) !== null) {
    const pm = incMatch[2].match(/^(.+?)\(\d+\)\s+reported contact\s+\(([\d.]+)\)\s+with another vehicle\s+(.+?)\(\d+\)/i);
    if (pm) {
      contactForceMap.set(`${incMatch[1]}::${pm[1].trim()}::${pm[3].trim()}`, parseFloat(pm[2]));
    }
  }

  // Second pass — classify each incident
  const lastImmovableTime = new Map<string, number>(); // driver → last et (seconds)
  incRegex.lastIndex = 0;
  while ((incMatch = incRegex.exec(text)) !== null) {
    const et = incMatch[1];
    const content = incMatch[2];

    const immovable = content.match(/^(.+?)\(\d+\)\s+reported contact\s+\(([\d.]+)\)\s+with Immovable/i);
    if (immovable) {
      const driver = immovable[1].trim();
      const etSec = parseFloat(et);
      const last = lastImmovableTime.get(driver);
      if (last === undefined || etSec - last >= 5) {
        ensureDriver(driver).immovableContacts++;
        lastImmovableTime.set(driver, etSec);
      }
      continue;
    }

    const pm = content.match(/^(.+?)\(\d+\)\s+reported contact\s+\(([\d.]+)\)\s+with another vehicle\s+(.+?)\(\d+\)/i);
    if (pm) {
      const driver   = pm[1].trim();
      const myForce  = parseFloat(pm[2]);
      const opponent = pm[3].trim();
      const opponentForce = contactForceMap.get(`${et}::${opponent}::${driver}`) ?? myForce;
      ensureDriver(driver).playerContacts.push({ opponent, myForce, opponentForce });
    }
  }

  return {
    entries: sorted.map((s) => s.e),
    extended: sorted.map((s) => s.x),
    meta,
    incidentBreakdown,
  };
}

// ── Public entry point ────────────────────────────────────────────────────────

export function parseFile(filename: string, text: string): ParseResult {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "json") return parseJSON(text);
  if (ext === "csv") return parseCSV(text);
  if (ext === "xml") return parseXML(text);
  throw new Error("Format non supporté. Utilisez .xml (LMU), .json ou .csv.");
}

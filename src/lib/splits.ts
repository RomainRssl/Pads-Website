export interface SplitDriver {
  discordId: string | null;
  pseudoLmu: string;
}

export interface ClassInput {
  className: string;
  /**
   * Drivers already sorted best-first (highest ladderPoints first).
   * Drivers absent from the ranking must be appended at the end by the caller.
   */
  drivers: SplitDriver[];
}

export interface SplitClass {
  className: string;
  drivers: SplitDriver[];
}

export interface SplitResult {
  index: number;      // 1-based
  label: string;      // "Plateau 1", "Plateau 2"…
  serverName: string;
  password: string;
  classes: SplitClass[];
  total: number;
}

/**
 * Cuts an ordered array into nbSplits roughly equal chunks.
 * Earlier chunks receive the surplus, so split 1 gets the best drivers.
 */
function chunkEven<T>(items: T[], nbSplits: number): T[][] {
  const total = items.length;
  const base = Math.floor(total / nbSplits);
  const extra = total % nbSplits;
  const chunks: T[][] = [];
  let offset = 0;
  for (let i = 0; i < nbSplits; i++) {
    const size = base + (i < extra ? 1 : 0);
    chunks.push(items.slice(offset, offset + size));
    offset += size;
  }
  return chunks;
}

export function buildSplits(
  classes: ClassInput[],
  capacity: number,
  serverBase: string,
  passwordBase: string,
): SplitResult[] {
  const total = classes.reduce((sum, c) => sum + c.drivers.length, 0);
  const nbSplits = Math.max(1, Math.ceil(total / capacity));

  const chunksByClass = classes.map((c) => chunkEven(c.drivers, nbSplits));

  return Array.from({ length: nbSplits }, (_, s) => {
    const index = s + 1;
    const splitClasses: SplitClass[] = classes
      .map((c, ci) => ({ className: c.className, drivers: chunksByClass[ci][s] ?? [] }))
      .filter((sc) => sc.drivers.length > 0);

    return {
      index,
      label: `Plateau ${index}`,
      serverName: `${serverBase} Split ${index}`,
      password: `${passwordBase}s${index}`,
      classes: splitClasses,
      total: splitClasses.reduce((sum, sc) => sum + sc.drivers.length, 0),
    };
  });
}

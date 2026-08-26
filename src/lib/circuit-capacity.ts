/**
 * Capacité effective par circuit.
 * Règle : min(stands du circuit, taille de serveur RaceControl loué).
 * Seul Le Mans monte à 62. Les autres circuits WEC/ELMS sont en général à 50 max
 * en serveur RaceControl PADS — à ajuster si le forfait évolue.
 * TODO: vérifier la capacité réelle de chaque piste sur le serveur RaceControl PADS.
 */
export const CIRCUIT_CAPACITY: Record<string, number> = {
  // ── Le Mans Ultimate — circuits de base ───────────────────────────────────
  "Circuit de la Sarthe":                                              62,
  "Circuit de la Sarthe Mulsanne No Chicanes":                        62,
  "Algarve International Circuit (Portimão)":                         50,
  "Algarve International Circuit (Portimão) ELMS":                    50,
  "Autodromo Internazionale Enzo e Dino Ferrari (Imola) (2024 Pack 1 DLC)": 50,
  "Autodromo Internazionale Enzo e Dino Ferrari (Imola) ELMS (2024 Pack 1 DLC)": 50,
  "Autódromo José Carlos Pace (Interlagos) (2024 Pack 3 DLC)":        50,
  "Bahrain International Circuit":                                     50,
  "Bahrain International Endurance Circuit":                           50,
  "Bahrain International Outer Circuit":                               50,
  "Bahrain International Paddock Circuit":                             50,
  "Circuit of the Americas (2024 Pack 2 DLC)":                        50,
  "COTA National":                                                     50,
  "Daytona International Speedway":                                    50,
  "Laguna Seca (WeatherTech Raceway)":                                 50,
  "Fuji International Speedway":                                       50,
  "Fuji Classic Layout (No Chicane)":                                  50,
  "Lusail International Circuit (2024 Pack 5 DLC)":                   50,
  "Lusail International Circuit Short":                                50,
  "Monza":                                                             50,
  "Monza Curva Grande Layout":                                         50,
  "Sebring":                                                           50,
  "Sebring School Circuit":                                            50,
  "Spa-Francorchamps":                                                 50,
  "Spa Endurance Layout (62-car support)":                             62,
  // ── ELMS ──────────────────────────────────────────────────────────────────
  "Circuit de Barcelona-Catalunya (ELMS Pack 3 DLC)":                 50,
  "Circuit Paul Ricard (ELMS Pack 2 DLC)":                            50,
  "Paul Ricard 1a":                                                    50,
  "Paul Ricard 1av2":                                                  50,
  "Paul Ricard 1av2-short":                                            50,
  "Paul Ricard 3a":                                                    50,
  "Silverstone (ELMS Pack 1 DLC)":                                     50,
  "Silverstone GP (WEC)":                                              50,
  "Silverstone International":                                         50,
  "Silverstone National":                                              50,
  // ── Mystère ───────────────────────────────────────────────────────────────
  "Mystère":                                                           50,
};

/** Returns circuit capacity, defaulting to 50 if unknown. */
export function getCircuitCapacity(track: string): number {
  return CIRCUIT_CAPACITY[track] ?? 50;
}

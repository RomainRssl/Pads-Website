// Liste des voitures / classes Le Mans Ultimate proposées dans les formulaires.
// Source unique : le formulaire de création de course et le mapping
// voiture → classe utilisé par les affiches (lib/poster.ts).

export const LMU_CARS = [
  { group: "LMGT3", options: [
    "LMGT3 (toute classe)",
    "Aston Martin Vantage AMR LMGT3 Evo",
    "BMW M4 LMGT3",
    "BMW M4 LMGT3 Evo",
    "Chevrolet Corvette Z06 LMGT3.R",
    "Ferrari 296 LMGT3",
    "Ford Mustang LMGT3",
    "Lamborghini Huracán LMGT3 Evo 2",
    "Lexus RC F LMGT3",
    "Mercedes-AMG LMGT3",
    "McLaren 720S LMGT3 Evo",
    "Porsche 911 LMGT3 R (992)",
  ]},
  { group: "Hypercar", options: [
    "Hypercar (toute classe)",
    "Alpine A424",
    "Aston Martin Valkyrie AMR LMH",
    "BMW M Hybrid V8",
    "Cadillac V-Series.R",
    "Ferrari 499P",
    "Genesis GMR-001 LMDh",
    "Glickenhaus SCG 007",
    "Isotta Fraschini Tipo 6-C",
    "Lamborghini SC63",
    "Peugeot 9X8 2023",
    "Peugeot 9X8 2024",
    "Porsche 963",
    "Toyota GR010-Hybrid",
    "Vanwall Vandervell 680",
  ]},
  { group: "LMP2", options: [
    "LMP2 (toute classe)",
    "Oreca 07 Gibson",
    "Oreca 07 Gibson ELMS",
  ]},
  { group: "LMP3", options: [
    "LMP3 (toute classe)",
    "Ligier JS P325",
    "Ginetta G61-LT-P3 Evo",
    "Duqueine D09",
  ]},
  { group: "GTE", options: [
    "GTE (toute classe)",
    "Aston Martin Vantage GTE",
    "Chevrolet Corvette C8.R",
    "Ferrari 488 GTE Evo",
    "Porsche 911 RSR-19",
  ]},
  { group: "Mystère", options: [
    "Mystère",
  ]},
];

// Index inverse : nom exact (voiture ou "X (toute classe)") → classe.
const CLASSE_PAR_NOM = new Map<string, string>();
for (const groupe of LMU_CARS) {
  const classe = groupe.group === "Mystère" ? "???" : groupe.group.toUpperCase();
  for (const nom of groupe.options) CLASSE_PAR_NOM.set(nom.toLowerCase(), classe);
}

/**
 * Classe de course d'une entrée de Event.cars ("Ferrari 499P" → "HYPERCAR",
 * "LMGT3 (toute classe)" → "LMGT3", "Mystère" → "???").
 * Une valeur inconnue est renvoyée telle quelle en majuscules.
 */
export function carClassOf(nom: string): string {
  const propre = nom.trim();
  const connue = CLASSE_PAR_NOM.get(propre.toLowerCase());
  if (connue) return connue;
  const touteClasse = propre.match(/^(.+?)\s*\(toute classe\)$/i);
  if (touteClasse) return touteClasse[1].toUpperCase();
  if (/^myst/i.test(propre)) return "???";
  return propre.toUpperCase();
}

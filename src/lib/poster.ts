// lib/poster.ts
//
// Traduit un Event + son Track en données pour le template d'affiche,
// et compose le prompt de scène envoyé à Gemini.
//
// Toute la mise en forme (majuscules, "21H00", "UNIQUEMENT") vit ici et
// nulle part ailleurs : une seule source de vérité pour les 10 affiches.

import type { Event, Track } from '@prisma/client';
import { carClassOf } from './lmu-cars';

export type PosterData = {
  saison: string;
  circuit: string;
  circuitOfficiel: string;
  pays: string;
  localisation: string;
  drapeau: string;
  scene: string;
  jour: string;
  date: string;
  mois: string;
  semaine: string;
  categories: string[];
  accent: string;
  inscription: string;
  duree: string;
  dureeUnite: string;
  briefing: string;
  depart: string;
  practice: string;
  qualifs: string;
  essence: string;
  setup: string;
  meteo: string;
};

const FUSEAU = 'Europe/Paris';
const SAISON = 'SAISON 1';

/**
 * Les seuls champs dont l'affiche a besoin. Un Event complet satisfait ce
 * type, mais un brouillon issu du formulaire de création aussi — c'est ce
 * qui permet de prévisualiser une affiche avant que la course existe.
 */
export type PosterSource = Pick<
  Event,
  | 'date'
  | 'cars'
  | 'weekNumber'
  | 'posterAccent'
  | 'entryCredits'
  | 'raceDuration'
  | 'practiceMinutes'
  | 'qualiMinutes'
>;

// -- Dates -------------------------------------------------------------------

function partiesDate(d: Date) {
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, ...opts }).format(d);

  return {
    jour: fmt({ weekday: 'long' }).toUpperCase(),
    date: fmt({ day: 'numeric' }),
    mois: fmt({ month: 'long' }).toUpperCase(),
  };
}

/** "21H00" — l'heure telle qu'elle est vécue à Paris, pas en UTC. */
function heure(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d).replace(':', 'H');
}

// -- Catégories --------------------------------------------------------------

/**
 * Event.cars est un tableau JSON de { name, max_places } (ancien format
 * string[] toléré) où name est une voiture précise ("Ferrari 499P") ou une
 * classe entière ("LMGT3 (toute classe)"). On ramène chaque entrée à sa
 * classe de course, sans doublon : c'est elle qui figure sur l'affiche.
 */
export function categories(event: Pick<Event, 'cars'>): string[] {
  try {
    const brut = JSON.parse(event.cars);
    if (Array.isArray(brut)) {
      const noms = brut.map((c) =>
        typeof c === 'string' ? c : String((c as { name?: unknown })?.name ?? '')
      );
      const classes = noms
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => carClassOf(n));
      return [...new Set(classes)];
    }
  } catch { /* champ vide ou corrompu */ }
  return [];
}

// -- Données d'affiche -------------------------------------------------------

export function buildPosterData(
  event: PosterSource,
  track: Track,
  sceneUrl: string,
): PosterData {
  const { jour, date, mois } = partiesDate(event.date);
  const briefing = new Date(event.date.getTime() - 10 * 60_000);

  return {
    saison: SAISON,
    circuit: track.displayName.toUpperCase(),
    circuitOfficiel: track.officialName.toUpperCase(),
    pays: track.country.toUpperCase(),
    localisation: track.location.toUpperCase(),
    drapeau: `https://flagcdn.com/w80/${track.countryCode.toLowerCase()}.png`,
    scene: sceneUrl,

    jour, date, mois,
    semaine: String(event.weekNumber ?? ''),

    categories: categories(event),
    accent: event.posterAccent ?? '#F07000',

    inscription: String(event.entryCredits ?? 0),
    duree: String(event.raceDuration ?? 60),
    dureeUnite: 'MINUTES',
    briefing: heure(briefing),
    depart: heure(event.date),
    practice: String(event.practiceMinutes ?? 10),
    qualifs: String(event.qualiMinutes ?? 10),

    essence: 'ESSENCE X2',
    setup: 'SETUP OPEN',
    meteo: 'MÉTÉO VARIABLE',
  };
}

// -- Prompt de scène ---------------------------------------------------------

/**
 * Décrit la voiture attendue pour une classe donnée.
 * Sans ça, le modèle dessine une GT3 quand on lui demande une Hypercar.
 */
const SILHOUETTES: Record<string, string> = {
  HYPERCAR:
    'Le Mans Hypercar prototype: closed cockpit, very low and wide, huge rear wing, ' +
    'full aerodynamic bodywork covering the wheels',
  LMP2:
    'LMP2 prototype: closed cockpit, low profile, open wheel arches, ' +
    'smaller and simpler than a Hypercar',
  'P2 WEC':
    'LMP2 prototype: closed cockpit, low profile, open wheel arches',
  LMP3:
    'LMP3 prototype: closed cockpit, compact entry-level prototype, ' +
    'simpler aerodynamics than an LMP2',
  GT3:
    'GT3 grand tourer: production-based silhouette, tall greenhouse, ' +
    'visible cabin, large rear wing mounted on the boot',
  LMGT3:
    'LMGT3 grand tourer: production-based silhouette, tall cabin, large rear wing',
  LMGTE:
    'LMGTE grand tourer: production-based silhouette, wide arches, rear wing',
  GTE:
    'LMGTE grand tourer: production-based silhouette, wide arches, rear wing',
};

function silhouette(categorie: string): string {
  const cle = categorie.toUpperCase().trim();
  return SILHOUETTES[cle] ?? `${cle} racing car`;
}

/**
 * Le prompt ne demande QUE la scène : aucun texte, aucun logo, aucune bordure.
 * Tout le reste de l'affiche est composé par le template.
 */
export function buildScenePrompt(
  event: Pick<Event, 'cars'>,
  track: Track,
): string {
  // "???" (course mystère) ne décrit aucune voiture : on retombe sur un
  // peloton générique plutôt que de demander une "??? racing car".
  const cats = categories(event).filter((c) => c !== '???');
  const voitures = cats.length
    ? cats.map((c) => `one ${silhouette(c)}`).join(', and ')
    : 'a pack of endurance racing cars';

  return [
    `Cinematic photorealistic endurance racing scene at ${track.officialName}, ` +
      `${track.country}.`,
    `The circuit must be immediately recognisable through its real architecture, ` +
      `landscape and landmark features.`,
    `Show ${voitures}.`,
    cats.length > 1
      ? 'The different classes must be instantly distinguishable by silhouette.'
      : '',
    'Cars in motion, low camera angle, headlights on, dramatic side lighting, ' +
      'high contrast, dark moody atmosphere, motion blur on the background.',
    'Square composition, subject centred, nothing important near the edges.',
    'Absolutely no text, no lettering, no numbers, no logos, no watermark, ' +
      'no borders, no poster layout, no user interface.',
    'Photographic, not illustration, not cartoon, not 3D render.',
  ].filter(Boolean).join(' ');
}

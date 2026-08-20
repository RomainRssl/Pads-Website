import { getGuildConfig } from "@/lib/config";
import { fetchGuildMemberIdsWithRole, sendDirectMessage, sendDirectMessagesPaced } from "@/lib/discord-bot";
import { ENDURANCE_CAR_CLASS_LABELS, type EnduranceCarClass } from "@/lib/endurance";
import type { Endurance, EnduranceGroup } from "@prisma/client";

function siteUrl(path: string): string {
  const base = process.env.NEXTAUTH_URL ?? "";
  return `${base}${path}`;
}

function carLabel(carClass: string): string {
  return ENDURANCE_CAR_CLASS_LABELS[carClass as EnduranceCarClass] ?? carClass;
}

function formatRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
  return `${fmt(start)} → ${fmt(end)}`;
}

// Envoie un DM à tous les membres inscrits sur le site qui possèdent le rôle
// endurance configuré. Un échec individuel (DM fermés, etc.) n'interrompt pas
// les envois aux autres membres.
export async function notifyNewEndurance(endurance: Endurance): Promise<void> {
  const config = await getGuildConfig();
  if (!config?.enduranceRoleId) {
    console.warn("[endurance-notify] Aucun rôle endurance configuré, notification ignorée");
    return;
  }

  // Lecture directe des membres Discord ayant le rôle — touche tout le monde,
  // pas seulement les membres qui se sont déjà connectés au site (sinon seul
  // le créateur, forcément déjà en base pour accéder à l'admin, recevait le DM).
  const discordIds = await fetchGuildMemberIdsWithRole(config.enduranceRoleId);
  console.log(`[endurance-notify] ${discordIds.length} membre(s) avec le rôle endurance trouvé(s)`);

  const content =
    `🏁 **Nouvelle endurance en ligne : ${endurance.title}**\n` +
    `Circuit : ${endurance.track}\n` +
    `Créneau du week-end : ${formatRange(endurance.startDate, endurance.endDate)}\n\n` +
    `Pense à donner tes disponibilités (horaires + catégorie de voiture) sur le site :\n` +
    siteUrl(`/endurance/${endurance.id}/disponibilites`);

  const sent = await sendDirectMessagesPaced(discordIds, content);
  console.log(`[endurance-notify] DM envoyés avec succès : ${sent}/${discordIds.length}`);
}

export async function notifyGroupInvite(
  group: EnduranceGroup,
  discordId: string
): Promise<void> {
  const content =
    `🏎️ **Invitation endurance — ${group.teamName}**\n` +
    `Catégorie : ${carLabel(group.carClass)}\n` +
    `Créneau : ${formatRange(group.startTime, group.endTime)}\n\n` +
    `Un pilote t'a ajouté à cet équipage. Valide ta participation :\n` +
    siteUrl(`/endurance/groupes/${group.id}`);

  await sendDirectMessage(discordId, content);
}

export async function notifyGroupConfirmed(
  group: EnduranceGroup,
  discordId: string
): Promise<void> {
  const content =
    `✅ **Équipage confirmé — ${group.teamName}**\n` +
    `Tout le monde a validé, votre créneau est figé sur le calendrier :\n` +
    siteUrl(`/endurance/${group.enduranceId}/calendrier`);

  await sendDirectMessage(discordId, content);
}

export async function notifyGroupCancelled(
  group: EnduranceGroup,
  discordId: string,
  actorName: string
): Promise<void> {
  const content =
    `❌ **Équipage annulé — ${group.teamName}**\n` +
    `${actorName} a annulé cet équipage (imprévu). Les créneaux concernés redeviennent disponibles.\n` +
    siteUrl(`/endurance/${group.enduranceId}/equipe`);

  await sendDirectMessage(discordId, content);
}

import { prisma } from "@/lib/prisma";
import { getGuildConfig } from "@/lib/config";
import { fetchMemberRoles, sendDirectMessage } from "@/lib/discord-bot";
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

  const users = await prisma.user.findMany({
    where: { discordId: { not: null } },
    select: { discordId: true },
  });

  const content =
    `🏁 **Nouvelle endurance en ligne : ${endurance.title}**\n` +
    `Circuit : ${endurance.track}\n` +
    `Créneau du week-end : ${formatRange(endurance.startDate, endurance.endDate)}\n\n` +
    `Pense à donner tes disponibilités (horaires + catégorie de voiture) sur le site :\n` +
    siteUrl(`/endurance/${endurance.id}/disponibilites`);

  await Promise.all(
    users.map(async (u) => {
      if (!u.discordId) return;
      const roles = await fetchMemberRoles(u.discordId);
      if (!roles.includes(config.enduranceRoleId!)) return;
      await sendDirectMessage(u.discordId, content);
    })
  );
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

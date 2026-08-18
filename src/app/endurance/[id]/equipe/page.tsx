import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EnduranceSubNav from "@/components/endurance/EnduranceSubNav";
import TeamBuilder from "@/components/endurance/TeamBuilder";
import { parseCarClasses } from "@/lib/endurance";

export default async function EquipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const endurance = await prisma.endurance.findUnique({ where: { id } });
  if (!endurance) notFound();

  return (
    <div>
      <EnduranceSubNav enduranceId={id} title={endurance.title} />
      <TeamBuilder
        enduranceId={id}
        carClasses={parseCarClasses(endurance.carClasses)}
        enduranceStart={endurance.startDate.toISOString()}
        enduranceEnd={endurance.endDate.toISOString()}
      />
    </div>
  );
}

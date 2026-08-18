import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EnduranceSubNav from "@/components/endurance/EnduranceSubNav";
import AvailabilityManager from "@/components/endurance/AvailabilityManager";
import { parseCarClasses } from "@/lib/endurance";

export default async function DisponibilitesPage({
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
      <AvailabilityManager
        enduranceId={id}
        carClasses={parseCarClasses(endurance.carClasses)}
        enduranceStart={endurance.startDate.toISOString()}
        enduranceEnd={endurance.endDate.toISOString()}
      />
    </div>
  );
}

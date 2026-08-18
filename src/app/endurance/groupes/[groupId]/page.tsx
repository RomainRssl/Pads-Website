import GroupConfirm from "@/components/endurance/GroupConfirm";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return (
    <div className="max-w-lg mx-auto">
      <GroupConfirm groupId={groupId} />
    </div>
  );
}

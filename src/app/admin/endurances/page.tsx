import EnduranceRoleConfig from "@/components/admin/EnduranceRoleConfig";
import EnduranceManager from "@/components/admin/EnduranceManager";

export default function AdminEndurancesPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="section-header">
        <div className="section-bar" />
        <h1 className="section-title">Endurances</h1>
      </div>
      <EnduranceRoleConfig />
      <EnduranceManager />
    </div>
  );
}

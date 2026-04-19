import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Admin — Par amour du spin",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen">
      {/* Admin top bar */}
      <div className="bg-brand-surface border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <span className="px-2.5 py-0.5 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs font-semibold">
            ADMIN
          </span>
          <nav className="flex items-center gap-1">
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg text-sm text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
            >
              Tableau de bord
            </Link>
            <Link
              href="/admin/create"
              className="px-3 py-1.5 rounded-lg text-sm text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
            >
              + Nouvelle course
            </Link>
            <Link
              href="/admin/results"
              className="px-3 py-1.5 rounded-lg text-sm text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
            >
              🏁 Résultats
            </Link>
            <Link
              href="/admin/streamers"
              className="px-3 py-1.5 rounded-lg text-sm text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
            >
              📺 Streamers
            </Link>
            <Link
              href="/admin/teams"
              className="px-3 py-1.5 rounded-lg text-sm text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
            >
              🏎️ Écuries
            </Link>
            <Link
              href="/admin/players"
              className="px-3 py-1.5 rounded-lg text-sm text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors"
            >
              👤 Pilotes
            </Link>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {children}
      </div>
    </div>
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Admin — Par amour du spin",
};

const NAV_LINKS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/create", label: "+ Course" },
  { href: "/admin/results", label: "🏁 Résultats" },
  { href: "/race-history", label: "📚 Historique" },
  { href: "/admin/streamers", label: "📺 Streamers" },
  { href: "/admin/teams", label: "🏎️ Écuries" },
  { href: "/admin/players", label: "👤 Pilotes" },
  { href: "/admin/categories", label: "🏁 Catégories" },
  { href: "/admin/licenses", label: "🎖️ Licences (DB)" },
];

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs font-semibold">
            ADMIN
          </span>
          {/* Nav scrollable horizontalement sur mobile */}
          <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none -mx-1 px-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm text-brand-muted hover:text-brand-text hover:bg-brand-border transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {children}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-brand-border mt-20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-heading text-lg font-bold text-brand-muted">
          Par amour du <span className="text-brand-orange">spin</span>
        </p>
        <p className="text-brand-muted text-sm">
          Communauté Sim Racing © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

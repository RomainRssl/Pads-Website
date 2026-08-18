export const metadata = {
  title: "Endurance — Par amour du spin",
};

export default function EnduranceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pt-24">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {children}
      </div>
    </div>
  );
}

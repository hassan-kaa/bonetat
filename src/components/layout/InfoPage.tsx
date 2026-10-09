/** Shared frame for the editorial pages (grading, guarantees, how it works, contact) */
export default function InfoPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="container-page flex flex-col gap-10 pb-6 pt-10">
      <header className="max-w-[44em]">
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.04em]">{title}</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">{intro}</p>
      </header>
      {children}
    </div>
  );
}

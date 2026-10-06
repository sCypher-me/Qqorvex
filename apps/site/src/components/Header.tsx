import { BrandSymbol, Wordmark, buttonClasses } from "@qqorvex/ui";

const LINKS = [
  { href: "#recursos", label: "Recursos" },
  { href: "#vex", label: "Vex" },
  { href: "#planos", label: "Planos" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-6 sm:px-8">
        <a href="#inicio" className="flex items-center gap-2" aria-label="Qqorvex — início">
          <BrandSymbol size={24} />
          <Wordmark size={19} />
        </a>
        <nav aria-label="Seções" className="hidden flex-1 items-center gap-6 text-[14px] text-fg-3 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-fg">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <a href="#lista" className={buttonClasses({ size: "sm" })}>
            Lista de espera
          </a>
        </div>
      </div>
    </header>
  );
}

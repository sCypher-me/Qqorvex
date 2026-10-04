import { BrandSymbol, Wordmark } from "@qqorvex/ui";
import { APK_URL, APK_URL_ARM32, APP_URL } from "../config";

export function Footer() {
  return (
    <footer className="border-t border-line-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-fg-3 sm:flex-row sm:items-center sm:px-8">
        <span className="flex items-center gap-2">
          <BrandSymbol size={20} />
          <Wordmark size={16} />
        </span>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2 sm:ml-auto">
          <a href={APK_URL} className="hover:text-fg">
            Baixar APK 64 bits
          </a>
          <a href={APK_URL_ARM32} className="hover:text-fg">
            APK 32 bits
          </a>
          <a href="#recursos" className="hover:text-fg">
            Recursos
          </a>
          <a href="#vex" className="hover:text-fg">
            Vex
          </a>
          <a href="#planos" className="hover:text-fg">
            Planos
          </a>
          <a href={APP_URL} className="hover:text-fg">
            Entrar no app
          </a>
        </nav>
        <p className="text-fg-4">© {new Date().getFullYear()} Qqorvex</p>
      </div>
    </footer>
  );
}

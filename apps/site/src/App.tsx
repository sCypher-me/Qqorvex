import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Modules } from "./components/Modules";
import { Plans } from "./components/Plans";
import { VexSection } from "./components/VexSection";
import { Waitlist } from "./components/Waitlist";

export function App() {
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Hero />
        <Modules />
        <VexSection />
        <Plans />
        <Waitlist />
      </main>
      <Footer />
    </>
  );
}

import { Link } from "react-router-dom";
import { VexConversationView } from "../vex/VexConversationView";

export function VexPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col p-4 gap-3">
      <Link to="/" className="text-sm text-text-secondary-warm hover:text-text-primary">
        Voltar para Hoje
      </Link>
      <div className="flex-1 max-w-2xl w-full mx-auto min-h-0">
        <VexConversationView />
      </div>
    </main>
  );
}

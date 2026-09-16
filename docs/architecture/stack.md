# Stack Tecnológica v1

Fonte: Xmind `Qqorvex` > Stack Tecnológica v1. Versões abaixo são as pinadas no Xmind; onde o
ambiente real só permitia versão estável menor, isso está anotado — reavaliar antes de cada
grande etapa (política de atualização do próprio projeto).

| Camada | Escolha | Observação |
|---|---|---|
| Runtime | Node.js 24 LTS, pnpm | pnpm real instalável no ambiente: 9.15.9 (spec pede 12.3.4, existe mas install de script global foi bloqueado por policy do npm; retomar depois) |
| Linguagem | TypeScript | usar última estável (5.7.x na prática) |
| Frontend | React 19 + Vite + @vitejs/plugin-react | |
| Design System / UI | Tailwind CSS v4 (`@tailwindcss/vite`), shadcn CLI, Radix UI | tokens em `packages/design-system` |
| Estado/Dados | TanStack Query (remoto), Zustand (local/UI), Dexie (offline/IndexedDB) | ainda não instalados — adicionar quando o primeiro módulo precisar |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) | projeto `qqorvex` criado (`sa-east-1`, free tier); Auth (e-mail+senha) e tabela `profiles` já em produção |
| Desktop/Mobile | Tauri 2 (Rust) empacotando o mesmo frontend para Windows/Android | ainda não configurado |
| Testes | Vitest, Playwright | ainda não configurados |
| Hospedagem Web | Cloudflare Pages | |
| E-mail transacional | provedor ainda não definido — pesquisar opção free tier antes de implementar confirmação de cadastro/recuperação de senha |
| Vex (IA) | camada própria (`packages/vex`) independente de provedor único; priorizar grátis/local no dev | |

Regra: nunca sacrificar a regra de custo R$0 de desenvolvimento por conveniência de uma lib paga.

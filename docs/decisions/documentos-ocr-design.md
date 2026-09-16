# Documentos — OCR de recibos/notas (Tesseract.js)

Data: 12/09/2026. Classificação: **bounded** (estende o fluxo de upload/visualização de
Documentos já existente; uma coluna nova, sem tabela nova, sem novo subsistema).

## Problema

`documents` não guardava nenhum texto extraído de imagem — recibo/nota fiscal fotografado
virava só um arquivo opaco, sem busca ou cópia do conteúdo. O Xmind original não detalhava a
implementação de OCR ("definido na implementação"/"evolução futura"), então o escopo abaixo é
uma decisão nova desta sessão, no mesmo espírito de Vida Pessoal e dos Checkpoints do Segundo
Cérebro.

## Decisões

- **Tesseract.js, 100% no navegador.** Sem chave, sem custo, sem Edge Function — mesmo critério
  de simplicidade/custo zero já usado no projeto. A lib baixa os dados de treinamento (`por`,
  português) sob demanda via rede na primeira extração; não é bundlada.
- **Import dinâmico.** Tesseract.js é pesada (WASM); só interessa a quem clica em "Extrair
  texto". `modules/gestao/documentos/src/ocr.ts` usa `await import("tesseract.js")` dentro de
  `extractTextFromImage()` — confirmado no build que ela vira chunk próprio, não infla o bundle
  principal.
- **Gatilho manual, não automático no upload.** Rodar OCR em todo upload gastaria
  processamento em documentos que não são imagem (PDF de contrato, etc.) sem necessidade —
  botão "Extrair texto" aparece só quando `mime_type` começa com `image/`
  (`isImageMimeType()`, novo em `service.ts`).
- **Uma coluna nova, sem tabela nova.** `documents.extracted_text` (nullable) — não existia
  nenhum campo equivalente. Sem RLS nova: é só mais uma coluna na tabela `documents` já protegida
  pela policy existente por `user_id`.
- **Sem re-extração automática nem histórico de versões do texto.** Se o texto já foi extraído,
  o botão vira "Ver texto extraído" (mostra/esconde um painel com "Copiar texto"); rodar de novo
  exigiria apagar o campo manualmente hoje — decisão consciente de manter simples na v1, mesmo
  padrão de "YAGNI" já aplicado a outras features desta sessão.
- **Sem integração com busca.** Documentos ainda não tem uma caixa de busca por texto — plugar
  `extracted_text` a um filtro é adiável até essa capacidade existir; o valor imediato é permitir
  ler/copiar o texto de uma foto de recibo/nota sem abrir a imagem.

## Arquivos

- `modules/gestao/documentos/src/ocr.ts` (novo) — `extractTextFromImage(imageUrl, onProgress?)`.
- `service.ts` — `isImageMimeType(mimeType)`.
- `repository.ts` — `updateExtractedText(client, documentId, text)`.
- `hooks/useDocumentos.ts` — `useExtractText(client)` (roda o OCR e persiste em sequência).
- `components/DocumentCard.tsx` — botão condicional "Extrair texto" / "Ver texto extraído" (com
  `%` de progresso durante a extração) e painel de texto com "Copiar texto".
- `apps/qqorvex/src/pages/Documentos.tsx` — obtém a signed URL da imagem
  (`getDownloadUrl`, já existente) e chama `useExtractText`.
- Migration `documents_add_extracted_text` — `alter table documents add column extracted_text text;`.

## Testes

Typecheck limpo (`module-documentos`, app) e build de produção limpo — chunk próprio do
Tesseract.js confirmado fora do bundle principal. Live-test contra o Supabase real: insert de um
documento de imagem, update de `extracted_text`, select confirmando o valor, delete de limpeza.
**Não testado em navegador de verdade** (este ambiente não tem browser) — rodar o worker
WebAssembly do Tesseract.js e o download dos dados de treinamento `por` só pode ser confirmado
manualmente pelo usuário: subir uma foto de recibo/nota em `/documentos`, clicar em "Extrair
texto" e conferir se o texto reconhecido aparece.

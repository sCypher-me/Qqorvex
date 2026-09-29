import { useMemo, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import type { Page, PageLink } from "../types";

const WIDTH = 1200;
const HEIGHT = 620;

interface SimNode {
  id: string;
  x: number;
  y: number;
}

function truncate(title: string, max = 22): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

/**
 * "Grafo de Conhecimento (visual)" — reaproveita `pages` e `page_links` (wiki links/backlinks)
 * que já existem; não é uma entidade nova, só uma visualização sobre o schema atual. Layout via
 * simulação de forças (d3-force) rodada de uma vez (não interativo/arrastável na v1).
 * Visual: o nó em foco (o que está sob o mouse ou, sem hover, o mais conectado) ganha destaque
 * cyan; os demais ficam grafite. O tamanho do nó cresce levemente com o número de conexões.
 */
export function GraphView({
  pages,
  links,
  onSelectPage,
}: {
  pages: Page[];
  links: PageLink[];
  onSelectPage: (pageId: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const positions = useMemo(() => {
    if (pages.length === 0) return new Map<string, SimNode>();

    const nodes: SimNode[] = pages.map((p) => ({ id: p.id, x: 0, y: 0 }));
    const pageIds = new Set(pages.map((p) => p.id));
    const simLinks = links
      .filter((l) => pageIds.has(l.source_page_id) && pageIds.has(l.target_page_id))
      .map((l) => ({ source: l.source_page_id, target: l.target_page_id }));

    const simulation = forceSimulation(nodes as never[])
      .force(
        "link",
        forceLink(simLinks as never[])
          .id((d) => (d as SimNode).id)
          .distance(90),
      )
      .force("charge", forceManyBody().strength(-180))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("collide", forceCollide(32))
      .stop();

    for (let i = 0; i < 300; i++) simulation.tick();

    return new Map(nodes.map((n) => [n.id, n]));
  }, [pages, links]);

  const degrees = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of links) {
      counts.set(link.source_page_id, (counts.get(link.source_page_id) ?? 0) + 1);
      counts.set(link.target_page_id, (counts.get(link.target_page_id) ?? 0) + 1);
    }
    return counts;
  }, [links]);

  const mostConnectedId = useMemo(() => {
    let bestId: string | null = null;
    let best = 0;
    for (const page of pages) {
      const degree = degrees.get(page.id) ?? 0;
      if (degree > best) {
        best = degree;
        bestId = page.id;
      }
    }
    return bestId;
  }, [pages, degrees]);

  const focusId = hoveredId ?? mostConnectedId;
  const pagesById = new Map(pages.map((p) => [p.id, p]));
  const focusPage = focusId ? pagesById.get(focusId) : undefined;

  if (pages.length === 0) {
    return (
      <div className="qv-card flex min-h-[560px] flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-4xl text-vex-cyan">⌁</span>
        <strong className="text-text-primary">Seu mapa começa com uma conexão.</strong>
        <p className="max-w-[360px] text-sm leading-relaxed text-text-secondary">Crie algumas páginas e use “Links internos” para ligar conceitos. Eles aparecem aqui automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="qv-card relative min-h-[560px] overflow-hidden bg-surface-1">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full opacity-95">
        <defs>
          <pattern id="sc-map-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="var(--qv-border-subtle)" strokeWidth="0.7" opacity="0.55" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#sc-map-grid)" opacity="0.5" />
        {links.map((link, index) => {
          const source = positions.get(link.source_page_id);
          const target = positions.get(link.target_page_id);
          if (!source || !target) return null;
          return (
            <line
              key={index}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={source.id === focusId || target.id === focusId ? "var(--qv-action-primary)" : "var(--qv-border-default)"}
              strokeWidth={source.id === focusId || target.id === focusId ? 2.2 : 1.35}
              opacity={focusId && source.id !== focusId && target.id !== focusId ? 0.42 : 0.8}
            />
          );
        })}
        {pages.map((page) => {
          const pos = positions.get(page.id);
          if (!pos) return null;
          const isFocus = page.id === focusId;
          const radius = isFocus ? 13 : 8 + Math.min(degrees.get(page.id) ?? 0, 4);
          return (
            <g
              key={page.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={() => onSelectPage(page.id)}
              onMouseEnter={() => setHoveredId(page.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="cursor-pointer"
            >
              <circle
                r={radius}
                fill={isFocus ? "var(--qv-action-primary-dim)" : "var(--qv-surface-card)"}
                stroke={isFocus ? "var(--qv-action-primary-hover)" : "var(--qv-border-default)"}
                strokeWidth={isFocus ? 2.2 : 1.5}
                style={{
                  transition: "fill 160ms, stroke 160ms, r 160ms",
                }}
              />
              <text
                textAnchor="middle"
                dy={radius + 18}
                fill={isFocus ? "var(--color-text-primary)" : "var(--color-text-secondary)"}
                style={{ fontSize: isFocus ? 13 : 11, fontFamily: "var(--font-sans)", fontWeight: isFocus ? 600 : 400, transition: "fill 160ms" }}
              >
                {truncate(pagesById.get(page.id)?.title ?? "")}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-x-5 top-5 flex items-start justify-between gap-4">
        <div className="qv-well max-w-[280px] px-3.5 py-3"><span className="qv-eyebrow text-vex-cyan-bright">Mapa mental</span><p className="mt-1.5 m-0 text-[12px] leading-relaxed text-text-secondary">A ideia mais conectada ganha foco. Passe o mouse e clique para entrar na página.</p></div>
        <div className="qv-well hidden sm:flex items-center gap-3 px-3.5 py-2.5 text-[11px] text-text-muted"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-vex-cyan" /> foco</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-text-muted" /> conexão</span></div>
      </div>
      {focusPage && <div className="pointer-events-none absolute bottom-5 left-5 max-w-[300px] qv-well px-3.5 py-3"><span className="qv-eyebrow">Em destaque</span><strong className="mt-1 block truncate text-[13px] text-text-primary">{focusPage.title}</strong><span className="mt-1 block text-[11px] text-text-muted">{degrees.get(focusPage.id) ?? 0} conexões · clique para abrir</span></div>}
    </div>
  );
}

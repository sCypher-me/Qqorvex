import { useMemo, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
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
          .distance(130),
      )
      .force("charge", forceManyBody().strength(-260))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("collide", forceCollide(56))
      // Puxa páginas sem ligação para perto do centro; sem isso elas fogem e o mapa encolhe.
      .force("x", forceX(WIDTH / 2).strength(0.07))
      .force("y", forceY(HEIGHT / 2).strength(0.1))
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

  // Enquadra o desenho nos nós de fato (a simulação não garante ficar no centro do quadro).
  const viewBox = useMemo(() => {
    const nodes = [...positions.values()];
    if (nodes.length === 0) return { x: 0, y: 0, width: WIDTH, height: HEIGHT };
    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);
    const minX = Math.min(...xs) - 90;
    const minY = Math.min(...ys) - 50;
    const width = Math.max(Math.max(...xs) + 90 - minX, 980);
    const height = Math.max(Math.max(...ys) + 70 - minY, 540);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { x: centerX - width / 2, y: centerY - height / 2 + 10, width, height, minX, minY };
  }, [positions]);

  const focusId = hoveredId ?? mostConnectedId;
  const pagesById = new Map(pages.map((p) => [p.id, p]));
  const focusPage = focusId ? pagesById.get(focusId) : undefined;

  if (pages.length === 0) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-2 p-6 text-center">
        <strong className="text-[15px] text-fg">Seu mapa começa com uma conexão</strong>
        <p className="max-w-[360px] text-[13px] leading-relaxed text-fg-3">Crie páginas e ligue umas às outras na lateral de cada página. As ligações aparecem aqui.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[min(620px,70dvh)] min-h-[420px] overflow-hidden bg-canvas/40">
      <svg viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" role="img" aria-label="Mapa de conexões entre páginas">
        <defs>
          <pattern id="sc-map-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="var(--q-line-soft)" strokeWidth="0.7" opacity="0.55" />
          </pattern>
        </defs>
        <rect x={viewBox.x - 2000} y={viewBox.y - 2000} width={viewBox.width + 4000} height={viewBox.height + 4000} fill="url(#sc-map-grid)" opacity="0.5" />
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
              stroke={source.id === focusId || target.id === focusId ? "var(--q-gold)" : "var(--q-line)"}
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
                fill={isFocus ? "var(--q-gold-press)" : "var(--q-raised)"}
                stroke={isFocus ? "var(--q-gold-hover)" : "var(--q-line)"}
                strokeWidth={isFocus ? 2.2 : 1.5}
                style={{
                  transition: "fill 160ms, stroke 160ms, r 160ms",
                }}
              />
              <text
                textAnchor="middle"
                dy={radius + 18}
                fill={isFocus ? "var(--q-fg)" : "var(--q-fg-2)"}
                stroke="var(--q-canvas)"
                strokeWidth={4}
                strokeLinejoin="round"
                paintOrder="stroke"
                style={{ fontSize: isFocus ? 13 : 11, fontFamily: "var(--font-sans)", fontWeight: isFocus ? 600 : 400, transition: "fill 160ms" }}
              >
                {truncate(pagesById.get(page.id)?.title ?? "")}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute right-4 top-4 hidden items-center gap-3 rounded-lg border border-line-soft bg-surface/80 px-3 py-2 text-[11px] text-fg-3 backdrop-blur-sm sm:flex">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gold" /> em foco
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-fg-4" /> página
        </span>
      </div>
      {focusPage && <div className="pointer-events-none absolute bottom-4 left-4 max-w-[300px] min-w-0 rounded-lg border border-line-soft bg-surface/85 px-3.5 py-3 backdrop-blur-sm"><span className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Em destaque</span><strong className="mt-1 block truncate text-[13px] text-fg">{focusPage.title}</strong><span className="mt-1 block text-[11px] text-fg-3">{degrees.get(focusPage.id) ?? 0} conexões · clique para abrir</span></div>}
    </div>
  );
}

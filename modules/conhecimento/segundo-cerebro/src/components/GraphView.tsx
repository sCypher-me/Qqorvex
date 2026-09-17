import { useMemo, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import type { Page, PageLink } from "../types";

const WIDTH = 900;
const HEIGHT = 460;

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
 * Visual: o nó em foco (o que está sob o mouse ou, sem hover, o mais conectado) fica cyan com
 * brilho; os demais ficam grafite. O tamanho do nó cresce levemente com o número de conexões.
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

  if (pages.length === 0) {
    return (
      <div className="qv-card flex h-[460px] items-center justify-center p-6">
        <p className="text-sm text-text-secondary">Crie páginas e links entre elas para ver o grafo.</p>
      </div>
    );
  }

  return (
    <div className="qv-card relative h-[460px] overflow-hidden">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
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
              stroke="#2A3039"
              strokeWidth={1.75}
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
                fill={isFocus ? "rgba(67,185,210,.5)" : "#1E232B"}
                stroke={isFocus ? "var(--color-vex-cyan-bright)" : "#2A3039"}
                strokeWidth={1.75}
                style={{
                  filter: isFocus ? "drop-shadow(0 0 10px rgba(67,185,210,.45))" : undefined,
                  transition: "fill 160ms, stroke 160ms",
                }}
              />
              <text
                textAnchor="middle"
                dy={radius + 18}
                fill="var(--color-text-secondary)"
                style={{ fontSize: 12, fontFamily: "var(--font-sans)" }}
              >
                {truncate(pagesById.get(page.id)?.title ?? "")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

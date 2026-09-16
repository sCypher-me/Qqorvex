import { useMemo } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import type { Page, PageLink } from "../types";

const WIDTH = 640;
const HEIGHT = 420;

interface SimNode {
  id: string;
  x: number;
  y: number;
}

function truncate(title: string, max = 18): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

/**
 * "Grafo de Conhecimento (visual)" — reaproveita `pages` e `page_links` (wiki links/backlinks)
 * que já existem; não é uma entidade nova, só uma visualização sobre o schema atual. Layout via
 * simulação de forças (d3-force) rodada de uma vez (não interativo/arrastável na v1).
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

  const pagesById = new Map(pages.map((p) => [p.id, p]));

  if (pages.length === 0) {
    return <p className="font-sans text-text-secondary-warm">Crie páginas e links entre elas para ver o grafo.</p>;
  }

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full border border-border rounded-md bg-surface-1">
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
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        );
      })}
      {pages.map((page) => {
        const pos = positions.get(page.id);
        if (!pos) return null;
        return (
          <g
            key={page.id}
            transform={`translate(${pos.x}, ${pos.y})`}
            onClick={() => onSelectPage(page.id)}
            className="cursor-pointer"
          >
            <circle r={16} className="fill-surface-2 stroke-brand-cyan" strokeWidth={1.5} />
            <text textAnchor="middle" dy={30} className="fill-text-primary" style={{ fontSize: 10 }}>
              {truncate(pagesById.get(page.id)?.title ?? "")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

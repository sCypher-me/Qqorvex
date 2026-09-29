import { useMemo, type ReactNode } from "react";
import { cx } from "@qqorvex/ui";
import { parseMarkdown, type Block, type Inline } from "./markdown";

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.t) {
      case "text":
        return node.v;
      case "br":
        return <br key={index} />;
      case "strong":
        return <strong key={index}>{renderInline(node.c)}</strong>;
      case "em":
        return <em key={index}>{renderInline(node.c)}</em>;
      case "code":
        return <code key={index}>{node.v}</code>;
      case "link":
        return (
          <a key={index} href={node.href} target="_blank" rel="noopener noreferrer">
            {renderInline(node.c)}
          </a>
        );
    }
  });
}

function renderBlock(block: Block, key: number): ReactNode {
  switch (block.t) {
    case "p":
      return <p key={key}>{renderInline(block.c)}</p>;
    case "h":
      return block.level === 3 ? <h3 key={key}>{renderInline(block.c)}</h3> : <h4 key={key} className="font-semibold">{renderInline(block.c)}</h4>;
    case "ul":
    case "ol": {
      const items = block.items.map((item, index) => (
        <li key={index}>
          {renderInline(item.c)}
          {item.children && renderBlock(item.children, 0)}
        </li>
      ));
      return block.t === "ol" ? (
        <ol key={key} start={block.start !== 1 ? block.start : undefined}>
          {items}
        </ol>
      ) : (
        <ul key={key}>{items}</ul>
      );
    }
    case "quote":
      return <blockquote key={key}>{renderInline(block.c)}</blockquote>;
    case "pre":
      return (
        <pre key={key}>
          <code>{block.v}</code>
        </pre>
      );
    case "hr":
      return <hr key={key} className="border-line" />;
    case "table":
      return (
        <div key={key} className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {block.head.map((cell, index) => (
                  <th key={index}>{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td key={index}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Resposta da Vex formatada (listas, negrito, títulos) sem nunca injetar HTML. */
export function VexMarkdown({ text, className }: { text: string; className?: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return <div className={cx("q-prose q-prose-chat", className)}>{blocks.map(renderBlock)}</div>;
}

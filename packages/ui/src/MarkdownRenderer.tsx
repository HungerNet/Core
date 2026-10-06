import type { ReactNode } from "react";

export interface MarkdownRendererProps {
  text: string;
}

interface MarkdownListItem {
  level: 0 | 1;
  content: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function renderInline(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code class='md-inline-code'>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
      if (!/^(https?:\/\/|mailto:)/i.test(href)) return label;
      return `<a href='${href}' target='_blank' rel='noopener noreferrer'>${label}</a>`;
    });
}

function buildList(items: MarkdownListItem[]): ReactNode[] {
  const output: ReactNode[] = [];
  let index = 0;

  while (index < items.length) {
    const item = items[index];
    if (!item) break;

    if (item.level === 0) {
      const children: MarkdownListItem[] = [];
      index += 1;
      while (index < items.length && items[index]?.level === 1) {
        const child = items[index];
        if (child) children.push(child);
        index += 1;
      }

      output.push(
        <li className="md-li" key={output.length}>
          <span dangerouslySetInnerHTML={{ __html: item.content }} />
          {children.length > 0 && (
            <ul className="md-ul">
              {children.map((child, childIndex) => (
                <li className="md-li" key={childIndex}>
                  <span dangerouslySetInnerHTML={{ __html: child.content }} />
                </li>
              ))}
            </ul>
          )}
        </li>,
      );
      continue;
    }

    output.push(
      <li className="md-li" key={output.length}>
        <span dangerouslySetInnerHTML={{ __html: item.content }} />
      </li>,
    );
    index += 1;
  }

  return output;
}

export function MarkdownRenderer({ text }: MarkdownRendererProps) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]?.trim().startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      elements.push(
        <pre className="md-pre" key={elements.length}>
          <code className={`lang-${language}`}>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (line.trim().startsWith("# ")) {
      elements.push(<h1 className="md-h1" key={elements.length}>{line.trim().slice(2)}</h1>);
      index += 1;
      continue;
    }
    if (line.trim().startsWith("## ")) {
      elements.push(<h2 className="md-h2" key={elements.length}>{line.trim().slice(3)}</h2>);
      index += 1;
      continue;
    }
    if (line.trim().startsWith("### ")) {
      elements.push(<h3 className="md-h3" key={elements.length}>{line.trim().slice(4)}</h3>);
      index += 1;
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items: MarkdownListItem[] = [];
      while (index < lines.length) {
        const match = (lines[index] ?? "").match(/^(\s*)-\s+(.*)/);
        if (!match) break;
        items.push({ level: match[1] ? 1 : 0, content: renderInline(match[2] ?? "") });
        index += 1;
      }
      elements.push(<ul className="md-ul" key={elements.length}>{buildList(items)}</ul>);
      continue;
    }

    if (line.includes("|") && lines[index + 1]?.includes("|---")) {
      const headers = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index]?.includes("|")) {
        rows.push((lines[index] ?? "").split("|").map((cell) => cell.trim()).filter(Boolean));
        index += 1;
      }
      elements.push(
        <div className="md-table-wrap" key={elements.length}>
          <table className="md-table">
            <thead><tr>{headers.map((header, headerIndex) => <th key={headerIndex} dangerouslySetInnerHTML={{ __html: renderInline(header) }} />)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} dangerouslySetInnerHTML={{ __html: renderInline(cell) }} />)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.trim().length > 0) {
      const paragraph = [renderInline(line.trim())];
      index += 1;
      while (index < lines.length && (lines[index] ?? "").trim().length > 0 && !/^\s*-\s+/.test(lines[index] ?? "")) {
        paragraph.push(renderInline((lines[index] ?? "").trim()));
        index += 1;
      }
      elements.push(<p className="md-p" key={elements.length} dangerouslySetInnerHTML={{ __html: paragraph.join(" ") }} />);
      continue;
    }

    index += 1;
  }

  return <div className="markdown-body">{elements}</div>;
}
import type { ReactNode } from "react"

interface MarkdownRendererProps {
  text: string
}

interface MarkdownListItem {
  level: 0 | 1
  content: string
}

export default function MarkdownRenderer({ text }: MarkdownRendererProps) {
  const lines = text.split("\n")
  const elements: ReactNode[] = []
  let i = 0

  function renderInline(str: string) {
    // Inline code: `code`
    str = str.replace(/`([^`]+)`/g, "<code class='md-inline-code'>$1</code>")

    // Bold: **text**
    str = str.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")

    // Italic: *text*
    str = str.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>")

    // Italic: _text_
    str = str.replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1<em>$2</em>")

    // Links: [text](url)
    str = str.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank'>$1</a>")

    return str
  }

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw

    // CODE BLOCKS
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim()
      i++
      const code = []
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i])
        i++
      }
      i++
      elements.push(
        <pre className="md-pre" key={elements.length}>
          <code className={`lang-${lang}`}>{code.join("\n")}</code>
        </pre>
      )
      continue
    }

    // HEADINGS
    if (line.trim().startsWith("# ")) {
      elements.push(
        <h1 className="md-h1" key={elements.length}>
          {line.trim().slice(2)}
        </h1>
      )
      i++
      continue
    }
    if (line.trim().startsWith("## ")) {
      elements.push(
        <h2 className="md-h2" key={elements.length}>
          {line.trim().slice(3)}
        </h2>
      )
      i++
      continue
    }
    if (line.trim().startsWith("### ")) {
      elements.push(
        <h3 className="md-h3" key={elements.length}>
          {line.trim().slice(4)}
        </h3>
      )
      i++
      continue
    }

    // LISTS (supports one level of nesting via leading spaces)
    if (/^\s*-\s+/.test(raw)) {
      const items = []

      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)-\s+(.*)/)
        if (!m) break

        const indentSpaces = m[1].length
        const level = indentSpaces > 0 ? 1 : 0 // 0 = top-level, 1 = nested

        items.push({
          level: level as 0 | 1,
          content: renderInline(m[2])
        })

        i++
      }

      function buildList(items: MarkdownListItem[]) {
        const out: ReactNode[] = []
        let idx = 0

        while (idx < items.length) {
          const item = items[idx]

          if (item.level === 0) {
            // Top-level item
            const children: MarkdownListItem[] = []
            idx++

            while (idx < items.length && items[idx].level === 1) {
              children.push(items[idx])
              idx++
            }

            out.push(
              <li className="md-li" key={out.length}>
                <span dangerouslySetInnerHTML={{ __html: item.content }} />
                {children.length > 0 && (
                  <ul className="md-ul">
                    {children.map((child, cIdx) => (
                      <li className="md-li" key={cIdx}>
                        <span
                          dangerouslySetInnerHTML={{ __html: child.content }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          } else {
            // Nested item without parent (fallback)
            out.push(
              <li className="md-li" key={out.length}>
                <span dangerouslySetInnerHTML={{ __html: item.content }} />
              </li>
            )
            idx++
          }
        }

        return out
      }

      elements.push(
        <ul className="md-ul" key={elements.length}>
          {buildList(items)}
        </ul>
      )

      continue
    }

    // TABLES
    if (line.includes("|") && lines[i + 1]?.includes("|---")) {
      const header = line.split("|").map(c => c.trim()).filter(Boolean)
      i += 2 // skip header + separator

      const rows = []
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map(c => c.trim()).filter(Boolean))
        i++
      }

      elements.push(
        <table className="md-table" key={elements.length}>
          <thead>
            <tr>
              {header.map((h, idx) => (
                <th
                  key={idx}
                  dangerouslySetInnerHTML={{ __html: renderInline(h) }}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
      continue
    }

    // PARAGRAPHS (last)
    if (line.trim().length > 0) {
      const buffer = [renderInline(line.trim())]
      i++
      while (i < lines.length && lines[i].trim().length > 0 && !/^\s*-\s+/.test(lines[i])) {
        buffer.push(renderInline(lines[i].trim()))
        i++
      }

      elements.push(
        <p
          className="md-p"
          key={elements.length}
          dangerouslySetInnerHTML={{ __html: buffer.join(" ") }}
        />
      )
      continue
    }

    i++
  }

  return <div className="markdown-body">{elements}</div>
}

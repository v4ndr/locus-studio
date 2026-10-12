import * as React from "react";

/**
 * Un rendu markdown minimal pour les réponses Locus et les courriers :
 * titres, paragraphes, listes, gras/italique, tableaux, renvois [n].
 * Pas de dépendance : la forme des réponses de core est connue et simple.
 */
export function Md({ text, onCite, className }: { text: string; onCite?: (n: number) => void; className?: string }) {
  const blocks = parse(text);
  return (
    <div className={`prose-locus ${className ?? ""}`}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1": return <h1 key={i}>{inline(b.text, onCite)}</h1>;
          case "h2": return <h2 key={i}>{inline(b.text, onCite)}</h2>;
          case "ul": return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, onCite)}</li>)}</ul>;
          case "ol": return <ol key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, onCite)}</li>)}</ol>;
          case "quote": return <blockquote key={i}>{inline(b.text, onCite)}</blockquote>;
          case "table": return (
            <table key={i}>
              <thead><tr>{b.head.map((c, j) => <th key={j}>{inline(c, onCite)}</th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c, onCite)}</td>)}</tr>)}</tbody>
            </table>
          );
          default: return <p key={i}>{inline(b.text, onCite)}</p>;
        }
      })}
    </div>
  );
}

type Block =
  | { type: "h1" | "h2" | "p" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] };

function parse(src: string): Block[] {
  const lines = src.replace(/\r/g, "").split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (/^#\s/.test(l)) { out.push({ type: "h1", text: l.replace(/^#\s+/, "") }); i++; continue; }
    if (/^#{2,6}\s/.test(l)) { out.push({ type: "h2", text: l.replace(/^#+\s+/, "") }); i++; continue; }
    if (/^>\s?/.test(l)) { out.push({ type: "quote", text: l.replace(/^>\s?/, "") }); i++; continue; }
    if (/^\|/.test(l)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        if (!/^\|\s*:?-+/.test(lines[i])) rows.push(lines[i].replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
        i++;
      }
      if (rows.length) out.push({ type: "table", head: rows[0], rows: rows.slice(1) });
      continue;
    }
    if (/^\s*[-*•]\s/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*•]\s+/, "")); i++; }
      out.push({ type: "ul", items });
      continue;
    }
    if (/^\s*\d+[.)]\s/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, "")); i++; }
      out.push({ type: "ol", items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|>|\||\s*[-*•]\s|\s*\d+[.)]\s)/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push({ type: "p", text: para.join(" ") });
  }
  return out;
}

function inline(text: string, onCite?: (n: number) => void): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[\d+\](?:\[\d+\])*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("*")) out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    else {
      const ns = t.match(/\d+/g)?.map(Number) ?? [];
      out.push(
        <sup key={k++} className="ml-0.5">
          {ns.map((n, j) => (
            <React.Fragment key={n}>
              {j > 0 && ","}
              <button type="button" onClick={() => onCite?.(n)} className="hover:underline">{n}</button>
            </React.Fragment>
          ))}
        </sup>,
      );
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// A tiny renderer for the bounty texts (description, rules): headings, lists
// and paragraphs, with inline `code` and **bold**. The text is escaped first,
// so nothing it contains can become markup.

import { esc } from './format.js';

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_, bold) => `<strong>${bold}</strong>`);
}

export function md(text) {
  const lines = String(text ?? '').split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol' | null
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const h2 = line.match(/^##\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    const ul = line.match(/^[-*]\s+(.*)/);
    const ol = line.match(/^\d+[.)]\s+(.*)/);
    if (h2) {
      closeList();
      out.push(`<h2>${inline(esc(h2[1]))}</h2>`);
    } else if (h3) {
      closeList();
      out.push(`<h3>${inline(esc(h3[1]))}</h3>`);
    } else if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      const item = ul ? ul[1] : ol[1];
      if (list !== kind) {
        closeList();
        list = kind;
        out.push(`<${kind}>`);
      }
      out.push(`<li>${inline(esc(item))}</li>`);
    } else {
      closeList();
      out.push(`<p>${inline(esc(line))}</p>`);
    }
  }
  closeList();
  return out.join('');
}

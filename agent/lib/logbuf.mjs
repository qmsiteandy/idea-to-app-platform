// 環形緩衝：保留最近 2000 行，n 為遞增游標
const MAX = 2000;
const lines = [];
let seq = 0;

export function log(text) {
  const s = String(text).replace(/\s+$/g, "");
  const entry = { n: ++seq, ts: new Date().toISOString(), text: s.slice(0, 2000) };
  lines.push(entry);
  if (lines.length > MAX) lines.shift();
  console.log(`[${entry.ts.slice(11, 19)}] ${entry.text}`);
}

export function logsAfter(after = 0) {
  return lines.filter((l) => l.n > after);
}

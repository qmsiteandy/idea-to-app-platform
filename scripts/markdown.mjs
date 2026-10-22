// Markdown → Notion 區塊（純函式，無相依）。scripts/ 與 agent/ 共用。
// 只產生 7 種文字區塊；寫入時只 append，不會刪除頁面上任何既有區塊。
// Notion rich_text 單段上限 2000 字
export function richText(s, max = 2000) {
  const out = [];
  for (let i = 0; i < s.length; i += max) out.push({ type: "text", text: { content: s.slice(i, i + max) } });
  return out;
}

const block = (type, text) => ({ object: "block", type, [type]: { rich_text: richText(text) } });

export function markdownToBlocks(md) {
  const blocks = [];
  let para = [];
  const flush = () => {
    if (para.length) blocks.push(block("paragraph", para.join("\n")));
    para = [];
  };
  for (const raw of md.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) flush();
    else if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      flush();
      blocks.push(block(`heading_${Math.min(m[1].length, 3)}`, m[2]));
    } else if ((m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/))) {
      flush();
      const b = block("to_do", m[2]);
      b.to_do.checked = m[1] !== " ";
      blocks.push(b);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flush();
      blocks.push(block("bulleted_list_item", m[1]));
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flush();
      blocks.push(block("numbered_list_item", m[1]));
    } else para.push(line.trim());
  }
  flush();
  return blocks;
}

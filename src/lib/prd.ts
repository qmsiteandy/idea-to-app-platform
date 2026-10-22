// PRD 內容的純函式：Markdown ⇄ 區塊。client 與 server 都能引用。
// 與 Notion 頁面內容一一對應：標題、段落、項目符號、編號、待辦。
export type PrdBlockType =
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "paragraph"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "to_do";

export type PrdBlock = { type: PrdBlockType; text: string; checked?: boolean };

export const PRD_MAX_LENGTH = 20000;

export function parseMarkdown(md: string): PrdBlock[] {
  const blocks: PrdBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "paragraph", text: para.join("\n") });
    para = [];
  };
  for (const raw of md.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (!line.trim()) flush();
    else if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      flush();
      blocks.push({ type: `heading_${Math.min(m[1].length, 3)}` as PrdBlockType, text: m[2] });
    } else if ((m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/))) {
      flush();
      blocks.push({ type: "to_do", text: m[2], checked: m[1] !== " " });
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flush();
      blocks.push({ type: "bulleted_list_item", text: m[1] });
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flush();
      blocks.push({ type: "numbered_list_item", text: m[1] });
    } else para.push(line.trim());
  }
  flush();
  return blocks;
}

export function toMarkdown(blocks: PrdBlock[]): string {
  const out: string[] = [];
  let n = 0;
  blocks.forEach((b, i) => {
    n = b.type === "numbered_list_item" ? n + 1 : 0;
    const prev = blocks[i - 1];
    const list = (t: PrdBlockType) => t === "bulleted_list_item" || t === "numbered_list_item" || t === "to_do";
    if (i > 0 && !(list(b.type) && prev && list(prev.type))) out.push("");
    switch (b.type) {
      case "heading_1": out.push(`# ${b.text}`); break;
      case "heading_2": out.push(`## ${b.text}`); break;
      case "heading_3": out.push(`### ${b.text}`); break;
      case "bulleted_list_item": out.push(`- ${b.text}`); break;
      case "numbered_list_item": out.push(`${n}. ${b.text}`); break;
      case "to_do": out.push(`- [${b.checked ? "x" : " "}] ${b.text}`); break;
      default: out.push(b.text);
    }
  });
  return out.join("\n");
}

// Notion rich_text 單段上限 2000 字
const richText = (s: string) => {
  const out: { type: "text"; text: { content: string } }[] = [];
  for (let i = 0; i < s.length; i += 2000) out.push({ type: "text", text: { content: s.slice(i, i + 2000) } });
  return out;
};

export function toNotionBlocks(blocks: PrdBlock[]) {
  return blocks.map((b) => {
    const rich_text = richText(b.text);
    const body = b.type === "to_do" ? { rich_text, checked: !!b.checked } : { rich_text };
    return { object: "block" as const, type: b.type, [b.type]: body };
  }) as import("@notionhq/client/build/src/api-endpoints").BlockObjectRequest[];
}

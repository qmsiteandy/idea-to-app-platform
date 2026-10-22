#!/usr/bin/env node
// 用法：node scripts/prd-write.mjs <pageId> <file.md>
// 把 Markdown PRD 寫進專案頁面內容，狀態改為「PRD 待審」，並留言通知。
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { makeClient, platformLink, richText } from "./lib.mjs";

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

export async function writePrd(client, pageId, md) {
  const blocks = markdownToBlocks(md);
  if (!blocks.length) throw new Error("PRD 內容為空，不寫入");
  for (let i = 0; i < blocks.length; i += 100) {
    await client.blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 100) });
  }
  await client.pages.update({ page_id: pageId, properties: { Status: { select: { name: "PRD 待審" } } } });
  const link = platformLink(pageId);
  await client.comments.create({
    parent: { page_id: pageId },
    rich_text: richText(`PRD 已產生，請審閱。${link ? `平台連結：${link}` : ""}`),
  });
  return blocks.length;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [pageId, file] = process.argv.slice(2);
  if (!pageId || !file) {
    console.error("用法：node scripts/prd-write.mjs <pageId> <file.md>");
    process.exit(2);
  }
  const n = await writePrd(makeClient(), pageId, await readFile(file, "utf8"));
  console.log(`已寫入 ${n} 個區塊並設為 PRD 待審`);
}

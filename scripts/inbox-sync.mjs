#!/usr/bin/env node
// 把收件匣中「待處理」的「新專案」點子建立成專案，並標記為已接手。
import { pathToFileURL } from "node:url";
import { INBOX_DS, PROJECTS_DS, makeClient, platformLink, richText, plain, queryAll } from "./lib.mjs";

export async function syncInbox(client) {
  const rows = await queryAll(client, {
    data_source_id: INBOX_DS,
    filter: {
      and: [
        { property: "Handled", select: { equals: "待處理" } },
        { property: "Type", select: { equals: "新專案" } },
      ],
    },
  });
  const created = [];
  for (const row of rows) {
    const title = plain(row.properties.Idea).trim();
    const details = plain(row.properties.Details).trim();
    if (!title && !details) continue; // 空白列不處理
    const page = await client.pages.create({
      parent: { type: "data_source_id", data_source_id: PROJECTS_DS },
      properties: {
        Name: { title: richText(title || details.slice(0, 40), 2000) },
        Idea: { rich_text: richText(details || title).slice(0, 1) },
        Status: { select: { name: "討論中" } },
      },
    });
    const link = platformLink(page.id);
    if (link) await client.pages.update({ page_id: page.id, properties: { "Edit in platform": { url: link } } });
    await client.pages.update({ page_id: row.id, properties: { Handled: { select: { name: "已接手" } } } });
    created.push({ inboxId: row.id, projectId: page.id, name: title });
  }
  return created;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const created = await syncInbox(makeClient());
  console.log(`已建立 ${created.length} 個專案`);
  for (const c of created) console.log(`- ${c.name} (${c.projectId})`);
}

#!/usr/bin/env node
// 列出「討論中」且頁面內容為空（尚無 PRD）的專案，輸出 JSON：[{id,name,idea}]
import { pathToFileURL } from "node:url";
import { PROJECTS_DS, makeClient, plain, queryAll } from "./lib.mjs";

export async function prdTargets(client) {
  const rows = await queryAll(client, {
    data_source_id: PROJECTS_DS,
    filter: { property: "Status", select: { equals: "討論中" } },
  });
  const targets = [];
  for (const row of rows) {
    const body = await client.blocks.children.list({ block_id: row.id, page_size: 1 });
    if (body.results.length > 0) continue;
    targets.push({ id: row.id, name: plain(row.properties.Name), idea: plain(row.properties.Idea) });
  }
  return targets;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await prdTargets(makeClient())));
}

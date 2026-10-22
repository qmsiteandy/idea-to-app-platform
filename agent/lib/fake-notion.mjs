// 測試用：讀寫平台本機檔案模式的 .data/projects.json（或 AGENT_FAKE_DATA_FILE），留言只寫進 log。
import { promises as fs } from "node:fs";
import path from "node:path";
import { AGENT_DIR } from "./env.mjs";
import { log } from "./logbuf.mjs";

export function makeFakeNotion() {
  const file = path.resolve(process.env.AGENT_FAKE_DATA_FILE || path.join(AGENT_DIR, "..", ".data", "projects.json"));
  const read = async () => {
    try {
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      return [];
    }
  };
  const proj = (p) => ({ id: p.id, name: p.name, idea: p.idea, status: { discussing: "討論中", prd_review: "PRD 待審" }[p.status] ?? p.status });
  return {
    async listDiscussing() {
      return (await read()).filter((p) => p.status === "discussing").map(proj);
    },
    async getProject(id) {
      const p = (await read()).find((x) => x.id === id);
      return p ? proj(p) : null;
    },
    async hasBody(id) {
      return !!(await read()).find((x) => x.id === id)?.prd;
    },
    async writePrd(id, md) {
      const rows = await read();
      const p = rows.find((x) => x.id === id);
      if (!p) throw new Error("找不到專案");
      p.prd = md;
      p.status = "prd_review";
      p.updated_at = new Date().toISOString();
      await fs.writeFile(file, JSON.stringify(rows, null, 2));
      return md.split("\n").length;
    },
    async comment(id, message) {
      log(`[fake-notion] 留言 @使用者：${message}`);
    },
  };
}

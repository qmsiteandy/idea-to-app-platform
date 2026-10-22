// 每個專案一個 JSON 檔：session_id 與對話訊息
import { promises as fs } from "node:fs";
import path from "node:path";

const ID_RE = /^[0-9a-fA-F-]{8,64}$/;
export const validId = (id) => typeof id === "string" && ID_RE.test(id);

export function makeStore(dir) {
  const cache = new Map();
  const file = (id) => path.join(dir, `${id}.json`);

  async function load(id) {
    if (!validId(id)) return null;
    if (cache.has(id)) return cache.get(id);
    try {
      const s = JSON.parse(await fs.readFile(file(id), "utf8"));
      cache.set(id, s);
      return s;
    } catch {
      return null;
    }
  }
  async function save(s) {
    cache.set(s.id, s);
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${file(s.id)}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(s, null, 2));
    await fs.rename(tmp, file(s.id));
  }
  async function create(project) {
    const s = { id: project.id, name: project.name, idea: project.idea, sessionId: null, seq: 0, messages: [], done: false, notified: false, started: false };
    await save(s);
    return s;
  }
  async function add(s, role, text) {
    const m = { n: ++s.seq, role, text, ts: new Date().toISOString() };
    s.messages.push(m);
    await save(s);
    return m;
  }
  return { load, create, add, save };
}

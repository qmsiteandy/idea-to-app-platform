# 本機 Agent（Windows 設定指南）

常駐在你自己電腦上的 Node 程式，使用你已登入的 **Claude Code 訂閱**（不需要 API key）：
1. 輪詢 Notion「專案」資料庫中狀態為「討論中」的專案，主動提出第一輪問題，並 @ 通知你。
2. 平台專案頁的「與 AI 討論」面板透過 Cloudflare Tunnel 與它對話。
3. 你滿意後（或按「產生 PRD」），它把 PRD 寫進 Notion 頁面，狀態改為「PRD 待審」並 @ 通知你。

沒有額外 npm 套件相依，只需要 Node.js 20 以上。

## 步驟（Windows）

1. 安裝 Node.js 20+（https://nodejs.org，選 LTS），並安裝 Git。
2. 開啟 PowerShell，安裝並登入 Claude Code：
   ```powershell
   npm install -g @anthropic-ai/claude-code
   claude
   ```
   第一次執行 `claude` 時依畫面指示用你的 Claude 訂閱帳號登入，成功後輸入 `/exit` 離開。
3. 取得程式碼：
   ```powershell
   git clone https://github.com/<你的帳號>/idea-to-app-platform.git
   cd idea-to-app-platform
   git checkout local-agent
   ```
4. 建立設定檔：
   ```powershell
   copy agent\.env.example agent\.env
   notepad agent\.env
   ```
   填入：
   | 變數 | 說明 |
   | --- | --- |
   | `NOTION_TOKEN` | Notion internal integration token（需已加入「專案」資料庫的 Connections，並開啟讀取、更新、插入留言權限） |
   | `NOTION_PROJECTS_DATA_SOURCE_ID` | 專案資料庫的 data source id |
   | `NOTION_NOTIFY_USER_ID` | 你的 Notion 使用者 ID，用於 @ 提及通知 |
   | `APP_URL` | 平台網址 |
   | `AGENT_TOKEN` | 自訂的長隨機字串（共用密鑰），平台要設定相同的值 |
   | `PORT` | 預設 8787 |
   | `WORKDIR` | Claude 的工作資料夾（預設 `agent\.workdir`） |
5. 啟動 agent：
   ```powershell
   node agent/index.mjs
   ```
   看到「agent 啟動，監聽 http://localhost:8787」即成功；按 Ctrl+C 結束。
6. 另開一個 PowerShell 視窗，用 Cloudflare Tunnel 把它公開給平台（快速模式，不需帳號）：
   ```powershell
   winget install Cloudflare.cloudflared
   cloudflared tunnel --url http://localhost:8787
   ```
   終端機會顯示 `https://xxxx.trycloudflare.com`。快速通道網址每次重啟都會變，需要更新平台的 `AGENT_URL`；想要固定網址請改用 Cloudflare 的具名通道。
7. 在平台（Vercel 環境變數或本機 `.env.local`）設定：
   - `AGENT_URL` = 上一步的 https 網址（不含結尾斜線）
   - `AGENT_TOKEN` = 與 `agent\.env` 相同的值
   重新部署後，在「討論中」專案頁就會看到「與 AI 討論」面板，狀態徽章顯示「在線」。

AGENT_TOKEN 是唯一的防護，請務必使用夠長的隨機字串；平台伺服器會代為轉發請求，瀏覽器不會看到它。

## HTTP API

所有路由都需 `Authorization: Bearer <AGENT_TOKEN>`。

- `GET /health` → `{ok, busy}`
- `GET /projects/:id/chat?after=N` → `{messages:[{n,role,text,ts}], busy, done}`
- `POST /projects/:id/chat` `{text}`（≤ 4000 字）
- `POST /projects/:id/prd` 要求 Claude 直接產生 PRD
- `GET /logs?after=N` → 最近 2000 行 log（含游標 `n`）

## 運作細節

- 每 10 秒查詢一次「討論中」且頁面內容為空、尚未有對話的專案。對話與 Claude `session_id` 存在 `agent/.state/<id>.json`。
- 以 `claude -p --output-format stream-json --verbose` 呼叫，後續訊息加 `--resume <session_id>`；一次只跑一個 Claude。
- 討論階段以 `--permission-mode dontAsk` 與 `--disallowedTools` 停用 Bash、Edit、Write、Read 等工具；使用者文字走 stdin，不經命令列。
- 回覆含 `<PRD>…</PRD>` 時，PRD 以 append 方式寫入 Notion 頁面（不會刪除既有區塊），共用 `scripts/markdown.mjs` 的轉換邏輯。
- Claude 或 Notion 出錯時只會記錄 log 並在聊天室顯示系統訊息，不會中止程式。

## 注意：Claude 旗標

本 agent 只使用在 `claude --help`（Claude Code 2.1.x）確認存在的旗標：`-p`、`--output-format`、`--verbose`、`--resume`、`--permission-mode`、`--disallowedTools`。

## 測試（不需 Notion、不需登入）

```bash
AGENT_FAKE_NOTION=1 AGENT_TOKEN=test AGENT_CLAUDE_BIN=agent/test/fake-claude.mjs node agent/index.mjs
```
`AGENT_FAKE_NOTION=1` 會讀寫平台本機檔案模式的 `.data/projects.json`；`fake-claude.mjs` 模擬 stream-json 輸出。

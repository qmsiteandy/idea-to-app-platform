# Idea to App

從點子到上線的自動化開發平台。目前為 P0 骨架：單人密碼登入、專案列表、新增與檢視專案。

## 本機執行

```bash
cp .env.example .env.local   # 填入 APP_PASSWORD 與 SESSION_SECRET
npm install
npm run dev
```

未設定 Notion 時，資料會暫存在 `.data/`（`projects.json`，僅供本機開發）。

## 資料存放

所有資料存在 Notion 的「專案」資料庫，平台是唯一的編輯入口，Notion 為唯讀檢視。

1. 到 https://www.notion.so/profile/integrations 建立 internal integration，複製 token。
2. 在 Notion 開啟「專案 Projects」資料庫，右上角「…」→ Connections，加入該 integration。
3. 設定 `NOTION_TOKEN` 與 `NOTION_PROJECTS_DATA_SOURCE_ID`。

## 使用流程

- **新增專案**（`/projects/new`）：填專案名稱與一句話構想。建立後由本機 agent 在專案頁與你討論需求，再產生 PRD 並以 Notion @ 通知你。
- **待你處理**：首頁最上方列出狀態為「PRD 待審」的專案。
- **PRD**：專案詳情頁顯示 PRD（Notion 頁面內容），可用 Markdown 編輯（取代整份內容），並可「核准 PRD」將狀態改為「建置中」。
  自動建置功能仍在開發中，核准目前只會更新狀態。

## 部署

匯入 Vercel，設定 `.env.example` 內的環境變數即可。

## 本機 Agent（主要流程）

專案狀態為「討論中」時，由常駐在你電腦上的 agent（`agent/`，使用你登入的 Claude Code 訂閱）與你在專案頁的「與 AI 討論」面板對話，滿意後產生 PRD 寫進 Notion、狀態改為「PRD 待審」並 @ 通知。設定步驟見 [agent/README.md](agent/README.md)；平台需設定 `AGENT_URL`、`AGENT_TOKEN`（見 `.env.example`），請求由 `/api/agent/*` 伺服器端轉發。

## PRD 自動產生（GitHub Actions，手動備援）

排程已移除，避免與 agent 搶同一個專案。agent 不可用時，可在 GitHub Actions 手動執行「PRD generation」（`.github/workflows/prd.yml`，workflow_dispatch）：對狀態為「討論中」且頁面內容為空的專案用 Claude 產生 PRD 寫進頁面，狀態改為「PRD 待審」，並以 Notion @ 留言通知（`NOTION_NOTIFY_USER_ID`）。沒有待處理專案時不會呼叫 Claude。

設定：
1. 專案 Notion 資料庫要分享給 integration（Connections）。
2. GitHub repo → Settings → Secrets and variables → Actions 新增：
   - `NOTION_TOKEN`：Notion integration token
   - `CLAUDE_CODE_OAUTH_TOKEN`：在本機執行 `claude setup-token` 取得（使用 Claude 訂閱，不需 API key）
3. 資料庫 id 與 `APP_URL` 寫在 workflow 的 `env`，換環境時修改該處。

腳本（`scripts/`）：`prd-targets.mjs`、`prd-write.mjs <pageId> <file.md>`（皆需 `NOTION_TOKEN`）、`markdown.mjs`（與 agent 共用的 Markdown 轉區塊）。
